import "server-only";
import { prisma } from "@/lib/db";
import type { Session } from "next-auth";
import type { Role, JenisPengadaan, Prisma } from "@prisma/client";

export async function getArsipPbj(id: string) {
  return prisma.arsipPbj.findUnique({
    where: { id },
    include: {
      file: true,
      createdBy: { select: { nama: true } },
      taksonomiJenisDoc: { select: { nama: true, id: true } },
      shares: {
        include: {
          user: { select: { nama: true } },
          grup: { select: { nama: true } },
        },
      },
    },
  });
}

// Jenis dokumen yang cocok dengan kombinasi jenis + metode pengadaan.
// Peta dengan dimensi null = berlaku umum.
export async function getJenisDocCocok(
  jenisPengadaan: JenisPengadaan | null,
  metodePengadaan: string | null
) {
  const peta = await prisma.taksonomiPeta.findMany({
    where: {
      OR: [
        { jenisPengadaan: null, metodePengadaan: null },
        { jenisPengadaan: jenisPengadaan ?? undefined, metodePengadaan: null },
        { jenisPengadaan: null, metodePengadaan: metodePengadaan ?? undefined },
        {
          jenisPengadaan: jenisPengadaan ?? undefined,
          metodePengadaan: metodePengadaan ?? undefined,
        },
      ],
    },
    include: { taksonomiJenisDoc: true },
  });
  // dedupe by doc id
  const map = new Map<string, { id: string; nama: string }>();
  for (const p of peta) {
    map.set(p.taksonomiJenisDoc.id, {
      id: p.taksonomiJenisDoc.id,
      nama: p.taksonomiJenisDoc.nama,
    });
  }
  return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
}

export async function getSemuaTaksonomi() {
  return prisma.taksonomiJenisDoc.findMany({
    include: { peta: true, _count: { select: { arsip: true } } },
    orderBy: { nama: "asc" },
  });
}

export async function getTahunTersedia() {
  const rows = await prisma.arsipPbj.findMany({
    distinct: ["tahun"],
    select: { tahun: true },
    orderBy: { tahun: "desc" },
  });
  return rows.map((r) => r.tahun);
}

/**
 * Daftar arsip PBJ terkelompok **per paket** untuk tampilan list.
 * Sumber baris = tabel `PaketPbj` (bukan dokumen), sehingga paket yang belum
 * punya dokumen pun tetap muncul. Tiap paket membawa:
 * - `dokumen`: dokumen yang SUDAH diunggah
 * - `slotKosong`: jenis dokumen yang SEHARUSNYA diunggah (dari taksonomi
 *   sesuai jenis+metode paket) tapi belum ada berkasnya — agar pengguna
 *   bisa langsung melengkapi berkas yang kurang.
 */
export async function getDaftarPaketPbj(
  session: Session,
  filter: {
    jenisPengadaan?: JenisPengadaan;
    metodePengadaan?: string;
    tahun?: number;
    kodePaket?: string;
    namaPaket?: string;
    halaman?: number;
    perHalaman?: number;
  } = {}
) {
  const uid = session.user.id;
  const role = session.user.role as Role;
  const perHalaman = Math.min(Math.max(filter.perHalaman ?? 15, 1), 100);
  const halaman = Math.max(filter.halaman ?? 1, 1);

  // Paket terlihat bila: admin/pimpinan, pembuatnya, atau anggota grup terkait.
  const paketVisible: Prisma.PaketPbjWhereInput =
    role === "ADMIN" || role === "PIMPINAN"
      ? {}
      : {
          OR: [
            { createdById: uid },
            { grup: { anggota: { some: { userId: uid } } } },
          ],
        };

  const where: Prisma.PaketPbjWhereInput = {
    AND: [
      paketVisible,
      filter.jenisPengadaan ? { jenisPengadaan: filter.jenisPengadaan } : {},
      filter.metodePengadaan ? { metodePengadaan: filter.metodePengadaan } : {},
      filter.tahun ? { tahun: filter.tahun } : {},
      filter.kodePaket ? { paketKode: { contains: filter.kodePaket, mode: "insensitive" } } : {},
      filter.namaPaket
        ? { paketNama: { contains: filter.namaPaket, mode: "insensitive" } }
        : {},
    ],
  };

  const [paketRows, total] = await Promise.all([
    prisma.paketPbj.findMany({
      where,
      include: {
        grup: { select: { id: true, nama: true } },
        createdBy: { select: { nama: true } },
        dokumen: {
          // dokumen di dalam paket mengikuti ACL masing-masing (share/creator)
          where:
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
          include: {
            file: { select: { fileName: true } },
            createdBy: { select: { nama: true } },
            taksonomiJenisDoc: { select: { nama: true } },
            // ringkasan penerima share (untuk info di list)
            shares: {
              select: {
                level: true,
                semuaUser: true,
                user: { select: { nama: true } },
                grup: { select: { nama: true } },
                role: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
    }),
    prisma.paketPbj.count({ where }),
  ]);

  // Slot dokumen yang diharapkan per (jenis, metode) — SATU query untuk semua
  // kombinasi (hindari N+1), lalu cocokkan di memori.
  const kunciKlas = new Set(paketRows.map((p) => `${p.jenisPengadaan}|${p.metodePengadaan}`));
  const jenisSet = [...new Set([...kunciKlas].map((k) => k.split("|")[0]))] as JenisPengadaan[];
  const metodeSet = [...new Set([...kunciKlas].map((k) => k.split("|")[1]))];
  const slotPerKlas = new Map<string, { taksonomiJenisDocId: string; nama: string }[]>();

  if (kunciKlas.size > 0) {
    const petaAll = await prisma.taksonomiPeta.findMany({
      where: {
        OR: [
          { jenisPengadaan: null, metodePengadaan: null },
          { jenisPengadaan: { in: jenisSet }, metodePengadaan: null },
          { jenisPengadaan: null, metodePengadaan: { in: metodeSet } },
          { jenisPengadaan: { in: jenisSet }, metodePengadaan: { in: metodeSet } },
        ],
      },
      include: { taksonomiJenisDoc: { select: { id: true, nama: true } } },
    });

    for (const k of kunciKlas) {
      const [jenis, metode] = k.split("|");
      const map = new Map<string, { id: string; nama: string }>();
      for (const p of petaAll) {
        const cocok =
          (p.jenisPengadaan === null || p.jenisPengadaan === jenis) &&
          (p.metodePengadaan === null || p.metodePengadaan === metode);
        if (cocok) map.set(p.taksonomiJenisDoc.id, p.taksonomiJenisDoc);
      }
      slotPerKlas.set(
        k,
        [...map.values()]
          .sort((a, b) => a.nama.localeCompare(b.nama))
          .map((c) => ({ taksonomiJenisDocId: c.id, nama: c.nama }))
      );
    }
  }

  const data = paketRows.map((p) => {
    const kunci = `${p.jenisPengadaan}|${p.metodePengadaan}`;
    const terpasang = new Set(p.dokumen.map((d) => d.taksonomiJenisDocId));
    const slot = slotPerKlas.get(kunci) ?? [];
    return {
      id: p.id,
      paketKode: p.paketKode,
      paketNama: p.paketNama,
      jenisPengadaan: p.jenisPengadaan,
      metodePengadaan: p.metodePengadaan,
      tahun: p.tahun,
      grup: p.grup,
      createdBy: p.createdBy.nama,
      terakhirDiubah: p.updatedAt,
      dokumen: p.dokumen.map((d) => ({
        id: d.id,
        jenisDocId: d.taksonomiJenisDocId,
        jenisDoc: d.taksonomiJenisDoc.nama,
        fileName: d.file.fileName,
        createdBy: d.createdBy.nama,
        createdAt: d.createdAt,
        // ringkasan penerima share (untuk info di list)
        penerima: d.shares.map((s) => ({
          nama: s.semuaUser
            ? "Semua Pengguna"
            : (s.user?.nama ?? s.grup?.nama ?? s.role ?? "-"),
          jenis: s.grup ? "grup" : s.user ? "user" : s.semuaUser ? "semua" : "role",
          level: s.level,
        })),
      })),
      slotKosong: slot
        .filter((s) => !terpasang.has(s.taksonomiJenisDocId))
        .map((s) => ({
          taksonomiJenisDocId: s.taksonomiJenisDocId,
          nama: s.nama,
        })),
    };
  });

  return {
    data,
    total,
    halaman,
    perHalaman,
    totalHalaman: Math.max(Math.ceil(total / perHalaman), 1),
  };
}
