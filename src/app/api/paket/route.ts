import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cariPaket, PaketApiError, TIPE_PAKET, type TipePaketValue } from "@/lib/paket";

/**
 * Proxy ke layanan Sipedal: detail paket berdasarkan kode + tipe sumber data.
 * `GET /api/paket?kode=10153919000&type=1`
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kode = searchParams.get("kode")?.trim() ?? "";
  const type = (searchParams.get("type") ?? "1") as TipePaketValue;

  if (!kode) {
    return NextResponse.json({ data: [], pesan: "Kode paket wajib diisi." }, { status: 400 });
  }
  if (!TIPE_PAKET.some((t) => t.value === type)) {
    return NextResponse.json({ data: [], pesan: "Tipe paket tidak dikenal." }, { status: 400 });
  }

  try {
    const data = await cariPaket({ kode, type });
    if (data.length === 0) {
      return NextResponse.json({
        data: [],
        pesan: `Paket ${kode} tidak ditemukan pada sumber data ${TIPE_PAKET.find((t) => t.value === type)?.label}.`,
      });
    }
    return NextResponse.json({ data });
  } catch (e) {
    const pesan = e instanceof PaketApiError ? e.message : "Gagal mengambil data paket.";
    return NextResponse.json({ data: [], pesan, error: "PAKET_API_ERROR" }, { status: 502 });
  }
}
