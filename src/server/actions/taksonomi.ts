"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminAtauUploader } from "@/lib/session";
import { logAudit } from "@/server/audit";
import type { JenisPengadaan } from "@prisma/client";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const docsSchema = z.object({
  nama: z.string().min(1, "Nama jenis dokumen wajib diisi").max(200),
  namaSingkat: z.string().min(1, "Nama singkat wajib diisi").max(50),
  keterangan: z.string().max(500).optional().nullable(),
});

const petaSchema = z.object({
  taksonomiJenisDocId: z.string().min(1),
  jenisPengadaan: z.string().optional().nullable(),
  metodePengadaan: z.string().optional().nullable(),
});

export async function createJenisDoc(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdminAtauUploader();
    const parsed = docsSchema.parse(input);
    const keterangan = parsed.keterangan?.trim() || null;
    const doc = await prisma.taksonomiJenisDoc.create({
      data: { nama: parsed.nama, namaSingkat: parsed.namaSingkat, keterangan },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "CREATE",
      entitas: "TaksonomiJenisDoc",
      entitasId: doc.id,
      detail: { nama: parsed.nama, namaSingkat: parsed.namaSingkat },
    });
    revalidatePath("/taksonomi");
    revalidatePath("/arsip-pbj");
    return { ok: true, id: doc.id };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateJenisDoc(id: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdminAtauUploader();
    const parsed = docsSchema.parse(input);
    const keterangan = parsed.keterangan?.trim() || null;
    const doc = await prisma.taksonomiJenisDoc.update({
      where: { id },
      data: { nama: parsed.nama, namaSingkat: parsed.namaSingkat, keterangan },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "UPDATE",
      entitas: "TaksonomiJenisDoc",
      entitasId: doc.id,
      detail: { nama: parsed.nama, namaSingkat: parsed.namaSingkat },
    });
    revalidatePath("/taksonomi");
    revalidatePath("/arsip-pbj");
    return { ok: true, id: doc.id };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteJenisDoc(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminAtauUploader();
    const dipakai = await prisma.arsipPbj.count({ where: { taksonomiJenisDocId: id } });
    if (dipakai > 0) {
      return { ok: false, error: `Tidak bisa dihapus: dipakai oleh ${dipakai} arsip` };
    }
    await prisma.taksonomiJenisDoc.delete({ where: { id } });
    await logAudit({
      userId: session.user.id,
      aksi: "DELETE",
      entitas: "TaksonomiJenisDoc",
      entitasId: id,
    });
    revalidatePath("/taksonomi");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function upsertPeta(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdminAtauUploader();
    const parsed = petaSchema.parse(input);
    const jenis = (parsed.jenisPengadaan || null) as JenisPengadaan | null;
    const metode = parsed.metodePengadaan || null;

    const existing = await prisma.taksonomiPeta.findFirst({
      where: {
        taksonomiJenisDocId: parsed.taksonomiJenisDocId,
        jenisPengadaan: jenis,
        metodePengadaan: metode,
      },
    });
    if (existing) {
      revalidatePath("/taksonomi");
      return { ok: true, id: existing.id };
    }
    const peta = await prisma.taksonomiPeta.create({
      data: {
        taksonomiJenisDocId: parsed.taksonomiJenisDocId,
        jenisPengadaan: jenis,
        metodePengadaan: metode,
      },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "CREATE",
      entitas: "TaksonomiPeta",
      entitasId: peta.id,
      detail: { jenis, metode },
    });
    revalidatePath("/taksonomi");
    revalidatePath("/arsip-pbj");
    return { ok: true, id: peta.id };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deletePeta(id: string): Promise<ActionResult> {
  try {
    await requireAdminAtauUploader();
    await prisma.taksonomiPeta.delete({ where: { id } });
    revalidatePath("/taksonomi");
    revalidatePath("/arsip-pbj");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "FORBIDDEN") return "Hanya admin atau uploader yang dapat mengubah taksonomi";
    if (e.message === "UNAUTHORIZED") return "Sesi berakhir, silakan login ulang";
    if (e.name === "ZodError") return "Input tidak valid";
    return e.message;
  }
  return "Terjadi kesalahan";
}
