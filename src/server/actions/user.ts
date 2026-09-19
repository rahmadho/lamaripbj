"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin, requireSession } from "@/lib/session";
import { logAudit } from "@/server/audit";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const RoleEnum = z.enum(["ADMIN", "PIMPINAN", "PEJABAT_FUNGSIONAL", "STAFF", "UPLOADER"]);

const USERNAME_RE = /^[a-z0-9._-]+$/;
const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username minimal 3 karakter")
  .max(50, "Username maksimal 50 karakter")
  .regex(USERNAME_RE, "Username hanya boleh huruf, angka, titik, garis bawah, atau strip");

// Email opsional: dipakai sebagai kontak/profil, bukan lagi untuk login.
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email tidak valid")
  .max(150)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

const createSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi").max(150),
  username: usernameField,
  email: emailField,
  role: RoleEnum,
  password: z.string().min(6, "Password minimal 6 karakter"),
});

const updateSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi").max(150),
  username: usernameField,
  email: emailField,
  role: RoleEnum,
  aktif: z.boolean(),
  password: z.string().min(6).optional().or(z.literal("")),
});

export async function createUser(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = createSchema.parse(input);
    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const user = await prisma.user.create({
      data: {
        nama: parsed.nama,
        username: parsed.username,
        email: parsed.email,
        role: parsed.role,
        passwordHash,
      },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "CREATE",
      entitas: "User",
      entitasId: user.id,
      detail: { username: parsed.username, role: parsed.role },
    });
    revalidatePath("/pengguna");
    return { ok: true, id: user.id };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateUser(id: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = updateSchema.parse(input);
    const data: Record<string, unknown> = {
      nama: parsed.nama,
      username: parsed.username,
      email: parsed.email,
      role: parsed.role,
      aktif: parsed.aktif,
    };
    if (parsed.password) {
      data.passwordHash = await bcrypt.hash(parsed.password, 10);
    }
    // cegah admin menonaktifkan/menurunkan dirinya sendiri
    if (id === session.user.id && (parsed.role !== "ADMIN" || !parsed.aktif)) {
      return { ok: false, error: "Tidak bisa menurunkan/menonaktifkan akun sendiri" };
    }
    await prisma.user.update({ where: { id }, data });
    await logAudit({
      userId: session.user.id,
      aksi: "UPDATE",
      entitas: "User",
      entitasId: id,
      detail: { username: parsed.username, role: parsed.role, aktif: parsed.aktif },
    });
    revalidatePath("/pengguna");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function toggleAktifUser(id: string, aktif: boolean): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    if (id === session.user.id && !aktif) {
      return { ok: false, error: "Tidak bisa menonaktifkan akun sendiri" };
    }
    await prisma.user.update({ where: { id }, data: { aktif } });
    await logAudit({
      userId: session.user.id,
      aksi: "UPDATE",
      entitas: "User",
      entitasId: id,
      detail: { aktif },
    });
    revalidatePath("/pengguna");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

const profilSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi").max(150),
  email: emailField,
});

export async function updateProfilSendiri(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsed = profilSchema.parse(input);
    if (parsed.email) {
      const bentrok = await prisma.user.findFirst({
        where: { email: parsed.email, id: { not: session.user.id } },
        select: { id: true },
      });
      if (bentrok) return { ok: false, error: "Email sudah dipakai pengguna lain" };
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { nama: parsed.nama, email: parsed.email },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "UPDATE",
      entitas: "User",
      entitasId: session.user.id,
      detail: { aksi: "update_profil" },
    });
    revalidatePath("/profil");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function gantiPasswordSendiri(
  passwordLama: string,
  passwordBaru: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (passwordBaru.length < 6) {
      return { ok: false, error: "Password baru minimal 6 karakter" };
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    const cocok = await bcrypt.compare(passwordLama, user.passwordHash);
    if (!cocok) return { ok: false, error: "Password lama salah" };
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: await bcrypt.hash(passwordBaru, 10) },
    });
    await logAudit({
      userId: session.user.id,
      aksi: "UPDATE",
      entitas: "User",
      entitasId: session.user.id,
      detail: { aksi: "ganti_password" },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "FORBIDDEN") return "Hanya admin yang dapat mengelola pengguna";
    if (e.message === "UNAUTHORIZED") return "Sesi berakhir, silakan login ulang";
    if (e.name === "ZodError") {
      const err = e as unknown as { errors?: { message: string }[] };
      return err.errors?.[0]?.message ?? "Input tidak valid";
    }
    if (e.message.includes("Unique constraint")) return "Username atau email sudah dipakai";
    return e.message;
  }
  return "Terjadi kesalahan";
}
