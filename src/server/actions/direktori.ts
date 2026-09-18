"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { canAccessDirektori } from "@/lib/acl";
import { direktoriSchema } from "@/lib/validators";
import { logAudit } from "@/server/audit";
import type { Role } from "@prisma/client";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function assertFolderWrite(dirId: string | null) {
  const session = await requireSession();
  if (!dirId) return session;
  const allowed = await canAccessDirektori(session, dirId, "CREATE_SUBDIR");
  const dir = await prisma.direktori.findUnique({
    where: { id: dirId },
    select: { ownerId: true },
  });
  const isOwner = dir?.ownerId === session.user.id;
  if (!allowed && !isOwner && session.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function createDirektori(input: unknown): Promise<ActionResult> {
  try {
    const parsed = direktoriSchema.parse(input);
    const session = await assertFolderWrite(parsed.parentId ?? null);
    const dir = await prisma.direktori.create({
      data: {
        nama: parsed.nama,
        deskripsi: parsed.deskripsi || null,
        parentId: parsed.parentId || null,
        bolehUpload: parsed.bolehUpload,
        uploadRoles: parsed.uploadRoles as Role[],
        ownerId: session.user.id,
      },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "CREATE",
      entitas: "Direktori",
      entitasId: dir.id,
      detail: { nama: parsed.nama, parentId: parsed.parentId },
    });
    revalidatePath("/arsip-pegawai");
    return { ok: true, id: dir.id };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateDirektori(
  id: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const parsed = direktoriSchema.parse(input);
    const session = await requireSession();
    const existing = await prisma.direktori.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!existing) return { ok: false, error: "Direktori tidak ditemukan" };
    if (session.user.role !== "ADMIN" && existing.ownerId !== session.user.id) {
      return { ok: false, error: "Tidak berhak mengubah direktori ini" };
    }
    await prisma.direktori.update({
      where: { id },
      data: {
        nama: parsed.nama,
        deskripsi: parsed.deskripsi || null,
        bolehUpload: parsed.bolehUpload,
        uploadRoles: parsed.uploadRoles as Role[],
      },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "UPDATE",
      entitas: "Direktori",
      entitasId: id,
      detail: { nama: parsed.nama, bolehUpload: parsed.bolehUpload },
    });
    revalidatePath("/arsip-pegawai");
    revalidatePath(`/arsip-pegawai/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteDirektori(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const existing = await prisma.direktori.findUnique({
      where: { id },
      select: { ownerId: true, nama: true },
    });
    if (!existing) return { ok: false, error: "Direktori tidak ditemukan" };
    // admin, owner, atau pemegang izin DELETE
    const izinHapus =
      session.user.role === "ADMIN" ||
      existing.ownerId === session.user.id ||
      (await canAccessDirektori(session, id, "DELETE"));
    if (!izinHapus) {
      return { ok: false, error: "Tidak berhak menghapus direktori ini" };
    }
    // hapus bertingkat (cascade via parentId tidak otomatis; kumpulkan descendants)
    const ids = await collectDescendants(id);
    await prisma.arsipPegawai.deleteMany({ where: { direktoriId: { in: ids } } });
    await prisma.direktori.deleteMany({ where: { id: { in: ids.reverse() } } });
    await logAudit({
      userId: session.user.id,
      aksi: "DELETE",
      entitas: "Direktori",
      entitasId: id,
      detail: { nama: existing.nama, jumlahTerhapus: ids.length },
    });
    revalidatePath("/arsip-pegawai");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

async function collectDescendants(rootId: string): Promise<string[]> {
  const result: string[] = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const children = await prisma.direktori.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    const ids = children.map((c) => c.id);
    if (!ids.length) break;
    result.push(...ids);
    frontier = ids;
  }
  return result;
}

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "FORBIDDEN") return "Tidak berhak menulis di direktori ini";
    if (e.message === "UNAUTHORIZED") return "Sesi berakhir, silakan login ulang";
    if (e.name === "ZodError") return "Input tidak valid";
    return e.message;
  }
  return "Terjadi kesalahan";
}
