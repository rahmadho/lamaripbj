"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { canAccessDirektori } from "@/lib/acl";
import { z } from "zod";
import { arsipPegawaiSchema, shareSchema, PermissionEnum } from "@/lib/validators";
import { saveFile, validateFile } from "@/lib/storage";
import { logAudit } from "@/server/audit";
import { canUploadTo } from "@/server/queries/direktori";
import type { PermissionLevel } from "@prisma/client";
import { izinValid, levelDariIzin } from "@/lib/izin";

type ActionResult = { ok: true; id?: string; jumlah?: number } | { ok: false; error: string };

export async function createArsipPegawai(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsed = arsipPegawaiSchema.parse({
      direktoriId: formData.get("direktoriId"),
      nomorDokumen: formData.get("nomorDokumen"),
      namaDokumen: formData.get("namaDokumen"),
      tanggal: formData.get("tanggal"),
    });
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "File wajib diunggah" };
    }

    // izin UPLOAD granular: owner/admin/uploadRole, atau share dengan izin UPLOAD
    const boleh =
      (await canAccessDirektori(session, parsed.direktoriId, "UPLOAD")) ||
      (await canUploadTo(session, parsed.direktoriId));
    if (!boleh) {
      return { ok: false, error: "Upload tidak diizinkan di direktori ini" };
    }

    const fileId = await saveFile(file, { folderLogis: "pegawai", validasi: validateFile });
    const arsip = await prisma.arsipPegawai.create({
      data: {
        direktoriId: parsed.direktoriId,
        nomorDokumen: parsed.nomorDokumen,
        namaDokumen: parsed.namaDokumen,
        tanggal: new Date(parsed.tanggal),
        fileId,
        createdById: session.user.id,
      },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "CREATE",
      entitas: "ArsipPegawai",
      entitasId: arsip.id,
      detail: { nomorDokumen: parsed.nomorDokumen, direktoriId: parsed.direktoriId },
    });
    revalidatePath(`/arsip-pegawai/${parsed.direktoriId}`);
    return { ok: true, id: arsip.id };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteArsipPegawai(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const arsip = await prisma.arsipPegawai.findUnique({
      where: { id },
      select: { createdById: true, direktoriId: true, fileId: true },
    });
    if (!arsip) return { ok: false, error: "Arsip tidak ditemukan" };
    // admin, pembuat arsip, atau pemegang izin DELETE di direktori induk
    const izinHapus =
      session.user.role === "ADMIN" ||
      arsip.createdById === session.user.id ||
      (await canAccessDirektori(session, arsip.direktoriId, "DELETE"));
    if (!izinHapus) {
      return { ok: false, error: "Tidak berhak menghapus arsip ini" };
    }
    await prisma.arsipPegawai.delete({ where: { id } });
    await prisma.fileObj.delete({ where: { id: arsip.fileId } }).catch(() => {});
    await logAudit({
      userId: session.user.id,
      aksi: "DELETE",
      entitas: "ArsipPegawai",
      entitasId: id,
    });
    revalidatePath(`/arsip-pegawai/${arsip.direktoriId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function shareSubjek(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsed = shareSchema.parse(input);
    // arsip PBJ: level VIEW/DOWNLOAD; direktori/arsip pegawai: izin multi-pilih
    const level = parsed.arsipPbjId
      ? (parsed.level ?? "VIEW")
      : izinValid(parsed.izin)
        ? levelDariIzin(parsed.izin)
        : "VIEW";
    const izin = parsed.arsipPbjId ? [] : (parsed.izin ?? []);

    // otorisasi: hanya owner/admin (direktori/arsip) atau pembuat arsip
    if (parsed.direktoriId) {
      const dir = await prisma.direktori.findUnique({
        where: { id: parsed.direktoriId },
        select: { ownerId: true },
      });
      if (!dir) return { ok: false, error: "Direktori tidak ditemukan" };
      if (session.user.role !== "ADMIN" && dir.ownerId !== session.user.id) {
        return { ok: false, error: "Tidak berhak membagikan direktori ini" };
      }
    }
    if (parsed.arsipPegawaiId) {
      const a = await prisma.arsipPegawai.findUnique({
        where: { id: parsed.arsipPegawaiId },
        select: { createdById: true },
      });
      if (!a) return { ok: false, error: "Arsip tidak ditemukan" };
      if (session.user.role !== "ADMIN" && a.createdById !== session.user.id) {
        return { ok: false, error: "Tidak berhak membagikan arsip ini" };
      }
    }
    if (parsed.arsipPbjId) {
      const a = await prisma.arsipPbj.findUnique({
        where: { id: parsed.arsipPbjId },
        select: { createdById: true },
      });
      if (!a) return { ok: false, error: "Arsip PBJ tidak ditemukan" };
      if (session.user.role !== "ADMIN" && a.createdById !== session.user.id) {
        return { ok: false, error: "Tidak berhak membagikan arsip ini" };
      }
    }

    // normalisasi target: gabungkan bentuk tunggal & majemuk, lalu unik
    const userId = parsed.userId || null;
    const grupId = parsed.grupId || null;
    const role = parsed.role ?? null;
    const semuaUser = parsed.semuaUser ?? false;
    const userIds = [...new Set([...(parsed.userIds ?? []), ...(userId ? [userId] : [])])];
    const grupIds = [...new Set([...(parsed.grupIds ?? []), ...(grupId ? [grupId] : [])])];
    const roles = [...new Set([...(parsed.roles ?? []), ...(role ? [role] : [])])];

    // basis data shareEntry bersama (tanpa target)
    const basis = {
      level: level as PermissionLevel,
      izin,
      semuaUser,
      direktoriId: parsed.direktoriId || null,
      arsipPegawaiId: parsed.arsipPegawaiId || null,
      arsipPbjId: parsed.arsipPbjId || null,
      createdBy: session.user.id,
    };

    const rows = [
      ...(semuaUser ? [{ ...basis, userId: null, grupId: null, role: null }] : []),
      ...userIds.map((id) => ({ ...basis, userId: id, grupId: null, role: null })),
      ...grupIds.map((id) => ({ ...basis, userId: null, grupId: id, role: null })),
      ...roles.map((r) => ({ ...basis, userId: null, grupId: null, role: r })),
    ];
    if (rows.length === 0) {
      return { ok: false, error: "Pilih minimal satu penerima" };
    }

    await prisma.shareEntry.createMany({ data: rows });
    await logAudit({
      userId: session.user.id,
      aksi: "SHARE",
      entitas: parsed.direktoriId
        ? "Direktori"
        : parsed.arsipPegawaiId
          ? "ArsipPegawai"
          : "ArsipPbj",
      entitasId: parsed.direktoriId ?? parsed.arsipPegawaiId ?? parsed.arsipPbjId,
      detail: {
        level,
        izin,
        jumlah: rows.length,
        target: semuaUser
          ? "SEMUA_USER"
          : { users: userIds, grups: grupIds, roles },
      },
    });
    revalidatePath("/arsip-pegawai");
    revalidatePath("/arsip-pbj");
    return { ok: true, jumlah: rows.length };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function hapusShare(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const share = await prisma.shareEntry.findUnique({
      where: { id },
      select: {
        createdBy: true,
        direktoriId: true,
        arsipPegawaiId: true,
        arsipPbjId: true,
        direktori: { select: { ownerId: true } },
        arsipPegawai: { select: { createdById: true } },
        arsipPbj: { select: { createdById: true } },
      },
    });
    if (!share) return { ok: false, error: "Share tidak ditemukan" };
    if (session.user.role !== "ADMIN") {
      const pemilikEntitas =
        share.direktori?.ownerId === session.user.id ||
        share.arsipPegawai?.createdById === session.user.id ||
        share.arsipPbj?.createdById === session.user.id;
      if (share.createdBy !== session.user.id && !pemilikEntitas) {
        return { ok: false, error: "Tidak berhak menghapus share ini" };
      }
    }
    await prisma.shareEntry.delete({ where: { id } });
    await logAudit({
      userId: session.user.id,
      aksi: "UNSHARE",
      entitas: share.direktoriId ? "Direktori" : share.arsipPegawaiId ? "ArsipPegawai" : "ArsipPbj",
      entitasId: share.direktoriId ?? share.arsipPegawaiId ?? share.arsipPbjId ?? undefined,
      detail: { shareId: id },
    });
    revalidatePath("/arsip-pegawai");
    revalidatePath("/arsip-pbj");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

const updateSharePbjSchema = z.object({
  arsipPbjId: z.string().min(1),
  level: PermissionEnum,
  grupIds: z.array(z.string()).default([]),
  userIds: z.array(z.string()).default([]),
});

/**
 * Perbarui seluruh penerima share sebuah arsip PBJ (sinkronisasi penuh):
 * - pasangan (grup|user) yang belum ada → dibuat
 * - yang sudah ada tapi levelnya berubah → diperbarui
 * - yang tidak lagi terdaftar → dihapus
 *
 * Hanya pembuat arsip atau ADMIN yang boleh memperbarui.
 */
export async function updateSharePbj(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsed = updateSharePbjSchema.parse(input);

    const arsip = await prisma.arsipPbj.findUnique({
      where: { id: parsed.arsipPbjId },
      select: { createdById: true, paketKode: true },
    });
    if (!arsip) return { ok: false, error: "Arsip PBJ tidak ditemukan" };
    if (session.user.role !== "ADMIN" && arsip.createdById !== session.user.id) {
      return { ok: false, error: "Tidak berhak memperbarui share arsip ini" };
    }

    // validasi keberadaan grup & user
    const grupIds = [...new Set(parsed.grupIds)];
    const userIds = [...new Set(parsed.userIds)];
    if (grupIds.length > 0) {
      const ada = await prisma.grup.count({ where: { id: { in: grupIds } } });
      if (ada !== grupIds.length) return { ok: false, error: "Ada grup yang tidak ditemukan" };
    }
    if (userIds.length > 0) {
      const ada = await prisma.user.count({ where: { id: { in: userIds }, aktif: true } });
      if (ada !== userIds.length) {
        return { ok: false, error: "Ada pengguna yang tidak ditemukan / tidak aktif" };
      }
    }

    const lama = await prisma.shareEntry.findMany({
      where: { arsipPbjId: parsed.arsipPbjId },
      select: { id: true, grupId: true, userId: true, level: true },
    });

    const kunci = (g: string | null, u: string | null) => (g ? `g:${g}` : u ? `u:${u}` : "");
    const lamaMap = new Map(lama.map((s) => [kunci(s.grupId, s.userId), s]));
    const baruSet = new Set<string>();
    for (const g of grupIds) baruSet.add(`g:${g}`);
    for (const u of userIds) baruSet.add(`u:${u}`);

    // 1) hapus yang tidak lagi terdaftar
    const dihapus = lama.filter((s) => !baruSet.has(kunci(s.grupId, s.userId)));
    if (dihapus.length > 0) {
      await prisma.shareEntry.deleteMany({
        where: { id: { in: dihapus.map((s) => s.id) } },
      });
    }

    // 2) buat yang baru / perbarui level yang berubah
    const dibuat = grupIds
      .filter((g) => !lamaMap.has(`g:${g}`))
      .map((g) => ({
        level: parsed.level as PermissionLevel,
        grupId: g,
        arsipPbjId: parsed.arsipPbjId,
        createdBy: session.user.id,
      }));
    const dibuatUser = userIds
      .filter((u) => !lamaMap.has(`u:${u}`))
      .map((u) => ({
        level: parsed.level as PermissionLevel,
        userId: u,
        arsipPbjId: parsed.arsipPbjId,
        createdBy: session.user.id,
      }));
    if (dibuat.length + dibuatUser.length > 0) {
      await prisma.shareEntry.createMany({ data: [...dibuat, ...dibuatUser] });
    }
    const diubah = [...lamaMap.values()].filter(
      (s) => baruSet.has(kunci(s.grupId, s.userId)) && s.level !== parsed.level
    );
    if (diubah.length > 0) {
      await prisma.shareEntry.updateMany({
        where: { id: { in: diubah.map((s) => s.id) } },
        data: { level: parsed.level as PermissionLevel },
      });
    }

    await logAudit({
      userId: session.user.id,
      aksi: "UPDATE_SHARE",
      entitas: "ArsipPbj",
      entitasId: parsed.arsipPbjId,
      detail: {
        level: parsed.level,
        grups: grupIds,
        users: userIds,
        dibuat: dibuat.length + dibuatUser.length,
        diubah: diubah.length,
        dihapus: dihapus.length,
      },
    });
    revalidatePath("/arsip-pbj");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function catatUnduh(session: { id: string }, entitas: string, entitasId: string) {
  await logAudit({ userId: session.id, aksi: "DOWNLOAD", entitas, entitasId });
}


function errMsg(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "UNAUTHORIZED") return "Sesi berakhir, silakan login ulang";
    if (e.name === "ZodError") {
      try {
        const err = e as unknown as { errors?: { message: string }[] };
        return err.errors?.[0]?.message ?? "Input tidak valid";
      } catch {
        return "Input tidak valid";
      }
    }
    return e.message;
  }
  return "Terjadi kesalahan";
}
