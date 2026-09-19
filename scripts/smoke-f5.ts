import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // user CRUD
  await prisma.user.deleteMany({ where: { username: "uji-f5" } });
  const user = await prisma.user.create({
    data: {
      nama: "UJI-F5 User",
      username: "uji-f5",
      email: "uji-f5@kantor.go.id",
      role: "STAFF",
      passwordHash: await bcrypt.hash("rahasia123", 10),
    },
  });
  console.log("user dibuat:", user.username, user.role);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "UPLOADER", aktif: false },
  });
  console.log("user update:", updated.role, updated.aktif);

  // audit filter
  await prisma.auditLog.create({
    data: { userId: user.id, aksi: "TEST", entitas: "User", entitasId: user.id },
  });
  const byAksi = await prisma.auditLog.count({ where: { aksi: "TEST" } });
  const byUser = await prisma.auditLog.count({ where: { userId: user.id } });
  console.log("audit by aksi:", byAksi, "by user:", byUser);

  // statistik groupBy
  const perJenis = await prisma.arsipPbj.groupBy({
    by: ["jenisPengadaan"],
    _count: { _all: true },
  });
  console.log("statistik per jenis:", perJenis.length);

  const raw = await prisma.$queryRaw<{ bulan: string; jumlah: bigint }[]>`
    SELECT to_char("createdAt", 'YYYY-MM') AS bulan, COUNT(*) AS jumlah
    FROM "ArsipPegawai" GROUP BY bulan ORDER BY bulan DESC LIMIT 12
  `;
  console.log("statistik per bulan (raw):", raw.length);

  // bersihkan
  await prisma.auditLog.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("OK — bersih");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
