import { getSession } from "next-auth/react";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return session;
}

// UPLOADER boleh mengelola taksonomi dokumen PBJ (tugas khususnya).
export async function requireAdminAtauUploader(): Promise<Session> {
  const session = await requireSession();
  const r = session.user.role;
  if (r !== "ADMIN" && r !== "UPLOADER") throw new Error("FORBIDDEN");
  return session;
}

export { getSession };
