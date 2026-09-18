import "server-only";
import { prisma } from "@/lib/db";

export async function logAudit(params: {
  userId?: string | null;
  aksi: string;
  entitas: string;
  entitasId?: string | null;
  detail?: unknown;
  ip?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        aksi: params.aksi,
        entitas: params.entitas,
        entitasId: params.entitasId ?? null,
        detail: params.detail ? (params.detail as object) : undefined,
        ip: params.ip ?? null,
      },
    });
  } catch {
    // audit tidak boleh menggagalkan aksi utama
  }
}
