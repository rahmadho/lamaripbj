import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

/**
 * Grup yang boleh dilekatkan ke paket oleh user saat ini:
 * - ADMIN/PIMPINAN/UPLOADER: semua grup
 * - role lain: hanya grup yang diikutinya
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const role = session.user.role as Role;
  const semua = role === "ADMIN" || role === "PIMPINAN" || role === "UPLOADER";

  const data = await prisma.grup.findMany({
    where: semua ? {} : { anggota: { some: { userId: session.user.id } } },
    select: { id: true, nama: true, _count: { select: { anggota: true } } },
    orderBy: { nama: "asc" },
  });

  return NextResponse.json({
    data: data.map((g) => ({ id: g.id, nama: g.nama, jumlahAnggota: g._count.anggota })),
  });
}
