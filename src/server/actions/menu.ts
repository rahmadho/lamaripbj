"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/server/audit";

type ActionResult = { ok: true } | { ok: false; error: string };

const RoleEnum = z.enum(["ADMIN", "PIMPINAN", "PEJABAT_FUNGSIONAL", "STAFF", "UPLOADER"]);

const menuSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1, "Label wajib diisi").max(100),
  path: z.string().min(1, "Path wajib diisi").max(200),
  icon: z.string().max(100).optional().or(z.literal("")),
  grup: z.string().max(60).optional().or(z.literal("")),
  urutan: z.number().int().default(0),
  aktif: z.boolean().default(true),
  roles: z.array(RoleEnum).default([]),
});

export async function createMenu(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = menuSchema.parse(input);
    await prisma.menuItem.create({
      data: {
        key: parsed.key,
        label: parsed.label,
        path: parsed.path,
        icon: parsed.icon || null,
        grup: parsed.grup?.trim() || null,
        urutan: parsed.urutan,
        aktif: parsed.aktif,
        roles: parsed.roles,
      },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "CREATE",
      entitas: "MenuItem",
      detail: { key: parsed.key, label: parsed.label },
    });
    revalidatePath("/", "layout");
    revalidatePath("/menu");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateMenu(id: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = menuSchema.parse(input);
    await prisma.menuItem.update({
      where: { id },
      data: {
        key: parsed.key,
        label: parsed.label,
        path: parsed.path,
        icon: parsed.icon || null,
        grup: parsed.grup?.trim() || null,
        urutan: parsed.urutan,
        aktif: parsed.aktif,
        roles: parsed.roles,
      },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "UPDATE",
      entitas: "MenuItem",
      entitasId: id,
      detail: { label: parsed.label, aktif: parsed.aktif },
    });
    revalidatePath("/", "layout");
    revalidatePath("/menu");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteMenu(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    await prisma.menuItem.delete({ where: { id } });
    await logAudit({
      userId: session.user.id,
      aksi: "DELETE",
      entitas: "MenuItem",
      entitasId: id,
    });
    revalidatePath("/", "layout");
    revalidatePath("/menu");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "FORBIDDEN") return "Hanya admin yang dapat mengubah menu";
    if (e.message === "UNAUTHORIZED") return "Sesi berakhir, silakan login ulang";
    if (e.name === "ZodError") return "Input tidak valid";
    if (e.message.includes("Unique constraint")) return "Key menu sudah dipakai";
    return e.message;
  }
  return "Terjadi kesalahan";
}
