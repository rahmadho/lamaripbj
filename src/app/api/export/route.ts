import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/server/audit";
import type { Role } from "@prisma/client";

// Batas eksplisit jumlah baris per ekspor — cegah konsumsi memori tak terbatas.
const EXPORT_LIMIT = 5000;

const JenisPengadaanEnum = z.enum([
  "BARANG",
  "KONSTRUKSI",
  "JASA_KONSULTANSI",
  "JASA_LAINNYA",
]);

const exportFilterSchema = z.object({
  jenisPengadaan: JenisPengadaanEnum.optional(),
  metode: z.string().max(100).optional(),
  tahun: z.coerce.number().int().min(2000).max(2100).optional(),
  kode: z.string().max(100).optional(),
});

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvEscape).join(";")).join("\r\n");
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("UNAUTHORIZED", { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const jenis = searchParams.get("jenis") ?? "pbj";
  const uid = session.user.id;
  const role = session.user.role as Role;

  let csv: string;
  let namaFile: string;

  if (jenis === "pegawai") {
    const rows = await prisma.arsipPegawai.findMany({
      where:
        role === "ADMIN"
          ? {}
          : {
              direktori: {
                OR: [
                  { ownerId: uid },
                  { shares: { some: { userId: uid } } },
                  { shares: { some: { role } } },
                  { shares: { some: { grup: { anggota: { some: { userId: uid } } } } } },
                  { shares: { some: { semuaUser: true } } },
                ],
              },
            },
      include: {
        direktori: { select: { nama: true } },
        createdBy: { select: { nama: true } },
      },
      orderBy: { tanggal: "desc" },
      take: EXPORT_LIMIT,
    });
    csv = toCsv(
      ["Nomor Dokumen", "Nama Dokumen", "Tanggal", "Direktori", "Diunggah Oleh"],
      rows.map((r) => [
        r.nomorDokumen,
        r.namaDokumen,
        r.tanggal.toISOString().slice(0, 10),
        r.direktori.nama,
        r.createdBy.nama,
      ])
    );
    namaFile = `arsip-pegawai-${Date.now()}.csv`;
  } else {
    // Validasi param dari klien (jangan percaya mentah) — buang yang tak valid.
    const f = exportFilterSchema.safeParse({
      jenisPengadaan: searchParams.get("jenisPengadaan") ?? undefined,
      metode: searchParams.get("metode") ?? undefined,
      tahun: searchParams.get("tahun") ?? undefined,
      kode: searchParams.get("kode") ?? undefined,
    });
    const p = f.success ? f.data : {};

    const rows = await prisma.arsipPbj.findMany({
      where: {
        AND: [
          role === "ADMIN" || role === "PIMPINAN"
            ? {}
            : {
                OR: [
                  { createdById: uid },
                  { shares: { some: { userId: uid } } },
                  { shares: { some: { role } } },
                  { shares: { some: { grup: { anggota: { some: { userId: uid } } } } } },
                  { shares: { some: { semuaUser: true } } },
                ],
              },
          p.jenisPengadaan ? { jenisPengadaan: p.jenisPengadaan } : {},
          p.metode ? { metodePengadaan: p.metode } : {},
          p.tahun ? { tahun: p.tahun } : {},
          p.kode ? { paketKode: { contains: p.kode, mode: "insensitive" } } : {},
        ],
      },
      include: {
        taksonomiJenisDoc: { select: { nama: true } },
        createdBy: { select: { nama: true } },
      },
      orderBy: { createdAt: "desc" },
      take: EXPORT_LIMIT,
    });
    csv = toCsv(
      [
        "Kode Paket",
        "Nama Paket",
        "Jenis Pengadaan",
        "Metode Pengadaan",
        "Tahun",
        "Jenis Dokumen",
        "Keterangan",
        "Diunggah Oleh",
      ],
      rows.map((r) => [
        r.paketKode,
        r.paketNama,
        r.jenisPengadaan,
        r.metodePengadaan,
        r.tahun,
        r.taksonomiJenisDoc.nama,
        r.keterangan ?? "",
        r.createdBy.nama,
      ])
    );
    namaFile = `arsip-pbj-${Date.now()}.csv`;
  }

  await logAudit({
    userId: uid,
    aksi: "EXPORT",
    entitas: jenis === "pegawai" ? "ArsipPegawai" : "ArsipPbj",
    detail: { jenis },
  });

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "X-Export-Limit": String(EXPORT_LIMIT),
    },
  });
}
