import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Kandidat penerima share perorangan untuk arsip PBJ:
 * seluruh pengguna aktif (klien yang memfilter tampilan, mis. Pejabat Pengadaan).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const data = await prisma.user.findMany({
    where: { aktif: true },
    select: { id: true, nama: true, email: true, role: true },
    orderBy: { nama: "asc" },
  });

  return NextResponse.json({ data });
}
