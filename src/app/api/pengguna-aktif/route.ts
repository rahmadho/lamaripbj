import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Kandidat penerima share perorangan untuk arsip PBJ.
 *
 * Hanya **PEJABAT_FUNGSIONAL** (Pejabat Pengadaan) yang boleh menjadi penerima
 * perorangan — PIMPINAN sudah punya akses penuh tanpa share, role lain tidak
 * relevan. `email` sengaja TIDAK diikutsertakan (minim PII); klien hanya butuh
 * id + nama.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const data = await prisma.user.findMany({
    where: { aktif: true, role: "PEJABAT_FUNGSIONAL" },
    select: { id: true, nama: true, role: true },
    orderBy: { nama: "asc" },
  });

  return NextResponse.json({ data });
}
