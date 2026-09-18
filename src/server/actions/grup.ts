"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/server/audit";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const grupSchema = z.object({
  nama: z.string().min(1, "Nama grup wajib diisi").max(150),
  anggotaIds: z.array(z.string()).default([]),
});

// Hanya Pejabat Fungsional aktif yang boleh jadi anggota. Dipanggil di
// create & update agar ID asing/tidak valid tidak bisa lolos dari client,
// walau sudah difilter di UI.
async function saringKandidat(ids: string[]): Promise<{ ids: string[]; ditolak: number }> {
  if (ids.length === 0) return { ids: [], ditolak: 0 };
  const unik = [...new Set(ids)];
  const cocok = await prisma.user.findMany({
    where: { id: { in: unik }, aktif: true, role: "PEJABAT_FUNGSIONAL" },
    select: { id: true },
  });
  return { ids: cocok.map((u) => u.id), ditolak: unik.length - cocok.length };
}

export async function createGrup(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = grupSchema.parse(input);
    const valid = await saringKandidat(parsed.anggotaIds);
    if (valid.ditolak > 0) {
      return {
        ok: false,
        error: `${valid.ditolak} user tidak memenuhi syarat anggota grup (harus Pejabat Fungsional aktif)`,
      };
    }
    const grup = await prisma.grup.create({
      data: {
        nama: parsed.nama,
        anggota: { create: valid.ids.map((userId) => ({ userId })) },
      },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "CREATE",
      entitas: "Grup",
      entitasId: grup.id,
      detail: { nama: parsed.nama, jumlahAnggota: parsed.anggotaIds.length },
    });
    revalidatePath("/grup");
    return { ok: true, id: grup.id };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateGrup(id: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = grupSchema.parse(input);
    const valid = await saringKandidat(parsed.anggotaIds);
    if (valid.ditolak > 0) {
      return {
        ok: false,
        error: `${valid.ditolak} user tidak memenuhi syarat anggota grup (harus Pejabat Fungsional aktif)`,
      };
    }
    await prisma.$transaction([
      prisma.grupAnggota.deleteMany({ where: { grupId: id } }),
      prisma.grup.update({
        where: { id },
        data: {
          nama: parsed.nama,
          anggota: { create: valid.ids.map((userId) => ({ userId })) },
        },
      }),
    ]);
    await logAudit({
      userId: session.user.id,
      aksi: "UPDATE",
      entitas: "Grup",
      entitasId: id,
      detail: { nama: parsed.nama, jumlahAnggota: parsed.anggotaIds.length },
    });
    revalidatePath("/grup");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteGrup(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    await prisma.grup.delete({ where: { id } });
    await logAudit({
      userId: session.user.id,
      aksi: "DELETE",
      entitas: "Grup",
      entitasId: id,
    });
    revalidatePath("/grup");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "FORBIDDEN") return "Hanya admin yang dapat mengelola grup";
    if (e.message === "UNAUTHORIZED") return "Sesi berakhir, silakan login ulang";
    if (e.name === "ZodError") {
      const err = e as unknown as { errors?: { message: string }[] };
      return err.errors?.[0]?.message ?? "Input tidak valid";
    }
    if (e.message.includes("Unique constraint")) return "Nama grup sudah dipakai";
    return e.message;
  }
  return "Terjadi kesalahan";
}
