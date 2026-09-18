"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { saveFile, validateFile } from "@/lib/storage";
import { logAudit } from "@/server/audit";
import { getByKode, PaketApiError, type TipePaketValue } from "@/lib/paket";
import type { JenisPengadaan, Role } from "@prisma/client";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const createSchema = z.object({
  paketKode: z.string().min(1, "Paket wajib dipilih"),
  tipePaket: z.enum(["1", "2", "3"]).default("1"),
  taksonomiJenisDocId: z.string().min(1, "Jenis dokumen wajib dipilih"),
  keterangan: z.string().max(1000).optional().or(z.literal("")),
});

type HasilBatch = {
  ok: true;
  jumlah: number;
  gagal: { nama: string; pesan: string }[];
};

/**
 * Unggah sekaligus banyak dokumen untuk satu paket.
 *
 * FormData:
 * - `paketKode`, `tipePaket`, `grupId` (opsional), `userIds` (JSON array, opsional), `keterangan`
 * - `items`        : JSON string `[{ jenisDocId, nama }]` — satu entri per jenis dokumen
 * - `file:<docId>` : File untuk tiap jenis dokumen
 *
 * Paket dilekatkan ke grup dan/atau perorangan (mis. Pejabat Pengadaan);
 * semua penerima otomatis dapat akses lihat & unduh tiap dokumennya.
 * Tiap dokumen disimpan independen: satu gagal tidak membatalkan yang lain.
 */
export async function createArsipPbjBatch(formData: FormData): Promise<HasilBatch | { ok: false; error: string }> {
  try {
    const session = await requireSession();

    const paketKode = String(formData.get("paketKode") ?? "").trim();
    const tipePaket = (String(formData.get("tipePaket") ?? "1") || "1") as TipePaketValue;
    const grupId = String(formData.get("grupId") ?? "").trim();
    const keterangan = String(formData.get("keterangan") ?? "").slice(0, 1000) || null;

    let userIds: string[] = [];
    try {
      const raw = formData.get("userIds");
      const parsedIds = typeof raw === "string" ? JSON.parse(raw) : [];
      if (Array.isArray(parsedIds)) {
        userIds = [...new Set(parsedIds.map(String).filter(Boolean))];
      }
    } catch {
      return { ok: false, error: "Daftar penerima tidak valid" };
    }

    if (!paketKode) return { ok: false, error: "Paket wajib dipilih" };
    if (!grupId && userIds.length === 0) {
      return { ok: false, error: "Pilih minimal satu grup atau perorangan penerima" };
    }

    const grup = grupId
      ? await prisma.grup.findUnique({ where: { id: grupId }, select: { id: true } })
      : null;
    if (grupId && !grup) return { ok: false, error: "Grup tidak ditemukan" };

    // pastikan setiap user penerima benar-benar ada & aktif
    if (userIds.length > 0) {
      const ada = await prisma.user.findMany({
        where: { id: { in: userIds }, aktif: true },
        select: { id: true },
      });
      if (ada.length !== userIds.length) {
        return { ok: false, error: "Ada penerima yang tidak ditemukan / tidak aktif" };
      }
    }

    let items: { jenisDocId: string; nama: string }[];
    try {
      const raw = formData.get("items");
      items = typeof raw === "string" ? JSON.parse(raw) : [];
    } catch {
      return { ok: false, error: "Daftar dokumen tidak valid" };
    }
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: "Pilih minimal satu jenis dokumen" };
    }

    // Validasi ulang paket ke API Sipedal (jangan percaya data dari klien).
    let paket;
    try {
      paket = await getByKode(paketKode, tipePaket);
    } catch (e) {
      const pesan = e instanceof PaketApiError ? e.message : "Gagal memverifikasi paket.";
      return { ok: false, error: pesan };
    }
    if (!paket) return { ok: false, error: "Paket tidak ditemukan pada sumber data." };

    // Buat/reuse entitas PaketPbj — induk dokumen & tempat grup dilekatkan.
    const paketPbj = await prisma.paketPbj.upsert({
      where: { paketKode_tahun: { paketKode: paket.kode, tahun: paket.tahun } },
      create: {
        paketKode: paket.kode,
        paketNama: paket.nama,
        jenisPengadaan: paket.jenisPengadaan,
        metodePengadaan: paket.metodePengadaan,
        tahun: paket.tahun,
        keterangan,
        grupId: grupId || null,
        createdById: session.user.id,
      },
      update: { grupId: grupId || null, keterangan },
      select: { id: true },
    });

    // Semua dokumen pada proses ini ter-link ke paket & di-share ke grup/user terpilih.
    const shareRows = [
      ...(grupId ? [{ level: "DOWNLOAD" as const, grupId, createdBy: session.user.id }] : []),
      ...userIds.map((uid) => ({
        level: "DOWNLOAD" as const,
        userId: uid,
        createdBy: session.user.id,
      })),
    ];

    let jumlah = 0;
    const gagal: { nama: string; pesan: string }[] = [];

    for (const it of items) {
      const nama = it?.nama || it?.jenisDocId || "Dokumen";
      try {
        const docId = String(it?.jenisDocId ?? "");
        if (!docId) throw new Error("Jenis dokumen tidak valid");

        const file = formData.get(`file:${docId}`);
        if (!(file instanceof File) || file.size === 0) {
          throw new Error("Berkas belum dipilih");
        }

        const doc = await prisma.taksonomiJenisDoc.findUnique({
          where: { id: docId },
          select: { id: true },
        });
        if (!doc) throw new Error("Jenis dokumen tidak ditemukan");

        const duplikat = await prisma.arsipPbj.findUnique({
          where: {
            paketKode_taksonomiJenisDocId: {
              paketKode: paket.kode,
              taksonomiJenisDocId: docId,
            },
          },
          select: { id: true },
        });
        if (duplikat) throw new Error("Sudah ada untuk paket ini");

        const fileId = await saveFile(file, { folderLogis: "pbj", validasi: validateFile });
        const arsip = await prisma.arsipPbj.create({
          data: {
            paketId: paketPbj.id,
            paketKode: paket.kode,
            paketNama: paket.nama,
            jenisPengadaan: paket.jenisPengadaan as JenisPengadaan,
            metodePengadaan: paket.metodePengadaan,
            tahun: paket.tahun,
            keterangan,
            taksonomiJenisDocId: docId,
            fileId,
            createdById: session.user.id,
            shares: shareRows.length > 0 ? { create: shareRows } : undefined,
          },
        });
        await logAudit({
          userId: session.user.id,
          aksi: "CREATE",
          entitas: "ArsipPbj",
          entitasId: arsip.id,
          detail: { paketKode: paket.kode, jenisDoc: docId, grupId: grupId || null, userIds },
        });
        jumlah++;
      } catch (e) {
        gagal.push({ nama, pesan: errMsg(e) });
      }
    }

    if (jumlah === 0) {
      return {
        ok: false,
        error:
          gagal.length > 0
            ? `Tidak ada dokumen yang berhasil diunggah. ${gagal[0].pesan}.`
            : "Tidak ada dokumen yang diunggah.",
      };
    }

    revalidatePath("/arsip-pbj");
    return { ok: true, jumlah, gagal };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function createArsipPbj(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsed = createSchema.parse({
      paketKode: formData.get("paketKode"),
      tipePaket: formData.get("tipePaket") ?? "1",
      taksonomiJenisDocId: formData.get("taksonomiJenisDocId"),
      keterangan: formData.get("keterangan"),
    });
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "File wajib diunggah" };
    }

    // Validasi ulang paket ke API Sipedal (jangan percaya data dari klien).
    let paket;
    try {
      paket = await getByKode(parsed.paketKode, parsed.tipePaket as TipePaketValue);
    } catch (e) {
      const pesan = e instanceof PaketApiError ? e.message : "Gagal memverifikasi paket.";
      return { ok: false, error: pesan };
    }
    if (!paket) return { ok: false, error: "Paket tidak ditemukan pada sumber data." };

    const doc = await prisma.taksonomiJenisDoc.findUnique({
      where: { id: parsed.taksonomiJenisDocId },
      select: { id: true },
    });
    if (!doc) return { ok: false, error: "Jenis dokumen tidak ditemukan" };

    const duplikat = await prisma.arsipPbj.findUnique({
      where: {
        paketKode_taksonomiJenisDocId: {
          paketKode: paket.kode,
          taksonomiJenisDocId: parsed.taksonomiJenisDocId,
        },
      },
      select: { id: true },
    });
    if (duplikat) {
      return { ok: false, error: "Dokumen jenis ini sudah ada untuk paket tersebut" };
    }

    const fileId = await saveFile(file, { folderLogis: "pbj", validasi: validateFile });
    const arsip = await prisma.arsipPbj.create({
      data: {
        paketKode: paket.kode,
        paketNama: paket.nama,
        jenisPengadaan: paket.jenisPengadaan as JenisPengadaan,
        metodePengadaan: paket.metodePengadaan,
        tahun: paket.tahun,
        keterangan: parsed.keterangan || null,
        taksonomiJenisDocId: parsed.taksonomiJenisDocId,
        fileId,
        createdById: session.user.id,
      },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "CREATE",
      entitas: "ArsipPbj",
      entitasId: arsip.id,
      detail: { paketKode: paket.kode, jenisDoc: parsed.taksonomiJenisDocId },
    });
    revalidatePath("/arsip-pbj");
    return { ok: true, id: arsip.id };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * Lengkapi berkas yang kurang pada paket yang sudah ada.
 * Boleh oleh: pembuat paket, ADMIN, atau anggota grup terikat paket
 * (Pejabat Pengadaan yang di-share). Dokumen baru otomatis ter-share ke grup.
 */
export async function lengkapiDokumenPaket(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const paketId = String(formData.get("paketId") ?? "");
    const docId = String(formData.get("taksonomiJenisDocId") ?? "");
    const file = formData.get("file");

    if (!paketId || !docId) return { ok: false, error: "Paket & jenis dokumen wajib dipilih" };
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Berkas wajib dipilih" };
    }

    const paket = await prisma.paketPbj.findUnique({
      where: { id: paketId },
      select: {
        id: true,
        paketKode: true,
        paketNama: true,
        jenisPengadaan: true,
        metodePengadaan: true,
        tahun: true,
        grupId: true,
        createdById: true,
      },
    });
    if (!paket) return { ok: false, error: "Paket tidak ditemukan" };

    // ACL: pembuat / ADMIN / anggota grup
    const uid = session.user.id;
    const role = session.user.role as Role;
    const anggotaGrup = paket.grupId
      ? await prisma.grupAnggota.findUnique({
          where: { grupId_userId: { grupId: paket.grupId, userId: uid } },
          select: { userId: true },
        })
      : null;
    if (role !== "ADMIN" && paket.createdById !== uid && !anggotaGrup) {
      return { ok: false, error: "Anda bukan anggota grup paket ini" };
    }

    const doc = await prisma.taksonomiJenisDoc.findUnique({
      where: { id: docId },
      select: { id: true },
    });
    if (!doc) return { ok: false, error: "Jenis dokumen tidak ditemukan" };

    const duplikat = await prisma.arsipPbj.findUnique({
      where: {
        paketKode_taksonomiJenisDocId: {
          paketKode: paket.paketKode,
          taksonomiJenisDocId: docId,
        },
      },
      select: { id: true },
    });
    if (duplikat) return { ok: false, error: "Dokumen jenis ini sudah ada untuk paket tersebut" };

    const fileId = await saveFile(file, { folderLogis: "pbj", validasi: validateFile });
    const arsip = await prisma.arsipPbj.create({
      data: {
        paketId: paket.id,
        paketKode: paket.paketKode,
        paketNama: paket.paketNama,
        jenisPengadaan: paket.jenisPengadaan,
        metodePengadaan: paket.metodePengadaan,
        tahun: paket.tahun,
        taksonomiJenisDocId: docId,
        fileId,
        createdById: uid,
        // dokumen pelengkap otomatis mengikuti grup paket
        shares: paket.grupId
          ? { create: { level: "DOWNLOAD", grupId: paket.grupId, createdBy: uid } }
          : undefined,
      },
      select: { id: true },
    });
    await prisma.paketPbj.update({ where: { id: paket.id }, data: { updatedAt: new Date() } });
    await logAudit({
      userId: uid,
      aksi: "CREATE",
      entitas: "ArsipPbj",
      entitasId: arsip.id,
      detail: { paketKode: paket.paketKode, jenisDoc: docId, pelengkap: true },
    });
    revalidatePath("/arsip-pbj");
    return { ok: true, id: arsip.id };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteArsipPbj(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const arsip = await prisma.arsipPbj.findUnique({
      where: { id },
      select: { createdById: true, fileId: true },
    });
    if (!arsip) return { ok: false, error: "Arsip tidak ditemukan" };
    if (session.user.role !== "ADMIN" && arsip.createdById !== session.user.id) {
      return { ok: false, error: "Tidak berhak menghapus arsip ini" };
    }
    await prisma.arsipPbj.delete({ where: { id } });
    await prisma.fileObj.delete({ where: { id: arsip.fileId } }).catch(() => {});
    await logAudit({
      userId: session.user.id,
      aksi: "DELETE",
      entitas: "ArsipPbj",
      entitasId: id,
    });
    revalidatePath("/arsip-pbj");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "UNAUTHORIZED") return "Sesi berakhir, silakan login ulang";
    if (e.name === "ZodError") {
      const err = e as unknown as { errors?: { message: string }[] };
      return err.errors?.[0]?.message ?? "Input tidak valid";
    }
    return e.message;
  }
  return "Terjadi kesalahan";
}
