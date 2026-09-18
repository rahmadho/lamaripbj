import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getJenisDocCocok } from "@/server/queries/arsip-pbj";
import type { JenisPengadaan } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const jenis = searchParams.get("jenis") as JenisPengadaan | null;
  const metode = searchParams.get("metode");
  const data = await getJenisDocCocok(jenis, metode);
  return NextResponse.json({ data });
}
