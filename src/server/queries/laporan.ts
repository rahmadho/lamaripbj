import "server-only";
import { prisma } from "@/lib/db";

export async function getSemuaUser() {
  return prisma.user.findMany({
    select: {
      id: true,
      nama: true,
      username: true,
      email: true,
      role: true,
      aktif: true,
      createdAt: true,
      _count: { select: { arsipPegawai: true, arsipPbj: true } },
    },
    orderBy: [{ role: "asc" }, { nama: "asc" }],
  });
}

export async function getAuditLog(filter: {
  userId?: string;
  aksi?: string;
  dari?: string;
  sampai?: string;
  page?: number;
  perPage?: number;
}) {
  const perPage =
    filter.perPage && filter.perPage > 0 ? Math.min(filter.perPage, 200) : 50;
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const where = {
    AND: [
      filter.userId ? { userId: filter.userId } : {},
      filter.aksi ? { aksi: filter.aksi } : {},
      filter.dari ? { createdAt: { gte: new Date(filter.dari) } } : {},
      filter.sampai
        ? { createdAt: { lte: new Date(`${filter.sampai}T23:59:59`) } }
        : {},
    ],
  };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { nama: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { rows, total, page, perPage, totalPage: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getDaftarAksiAudit() {
  const rows = await prisma.auditLog.findMany({
    distinct: ["aksi"],
    select: { aksi: true },
    orderBy: { aksi: "asc" },
  });
  return rows.map((r) => r.aksi);
}

export async function getStatistikDashboard() {
  const [
    totalArsipPegawai,
    totalArsipPbj,
    totalDirektori,
    totalUser,
    totalGrup,
    perJenis,
    perMetode,
    perTahun,
    perBulanPegawai,
    auditTerbaru,
  ] = await Promise.all([
    prisma.arsipPegawai.count(),
    prisma.arsipPbj.count(),
    prisma.direktori.count(),
    prisma.user.count({ where: { aktif: true } }),
    prisma.grup.count(),
    prisma.arsipPbj.groupBy({ by: ["jenisPengadaan"], _count: { _all: true } }),
    prisma.arsipPbj.groupBy({ by: ["metodePengadaan"], _count: { _all: true } }),
    prisma.arsipPbj.groupBy({ by: ["tahun"], _count: { _all: true }, orderBy: { tahun: "desc" } }),
    prisma.$queryRaw<{ bulan: string; jumlah: bigint }[]>`
      SELECT to_char("createdAt", 'YYYY-MM') AS bulan, COUNT(*) AS jumlah
      FROM "ArsipPegawai"
      GROUP BY bulan ORDER BY bulan DESC LIMIT 12
    `,
    prisma.auditLog.findMany({
      include: { user: { select: { nama: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    totalArsipPegawai,
    totalArsipPbj,
    totalDirektori,
    totalUser,
    totalGrup,
    perJenis: perJenis.map((r) => ({ label: r.jenisPengadaan, jumlah: r._count._all })),
    perMetode: perMetode.map((r) => ({ label: r.metodePengadaan, jumlah: r._count._all })),
    perTahun: perTahun.map((r) => ({ label: String(r.tahun), jumlah: r._count._all })),
    perBulanPegawai: perBulanPegawai.map((r) => ({
      label: r.bulan,
      jumlah: Number(r.jumlah),
    })),
    auditTerbaru,
  };
}
