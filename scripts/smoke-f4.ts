import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@kantor.go.id" } });
  const fungsional = await prisma.user.findUniqueOrThrow({
    where: { email: "fungsional@kantor.go.id" },
  });

  // bersihkan
  await prisma.arsipPegawai.deleteMany({ where: { namaDokumen: { startsWith: "UJI-CARI" } } });
  await prisma.direktori.deleteMany({ where: { nama: { startsWith: "UJI-CARI" } } });
  await prisma.grup.deleteMany({ where: { nama: { startsWith: "UJI-CARI" } } });

  // data pencarian
  const dir = await prisma.direktori.create({
    data: { nama: "UJI-CARI Direktori", ownerId: admin.id },
  });
  const file = await prisma.fileObj.create({
    data: { fileName: "cari.txt", storedName: "uji-cari.txt", mimeType: "text/plain", size: 1 },
  });
  await prisma.arsipPegawai.create({
    data: {
      direktoriId: dir.id,
      nomorDokumen: "UJI-CARI-001",
      namaDokumen: "UJI-CARI Dokumen Penting",
      tanggal: new Date(),
      fileId: file.id,
      createdById: admin.id,
    },
  });

  // pencarian ala cariArsip (contains)
  const hasil = await prisma.arsipPegawai.findMany({
    where: { namaDokumen: { contains: "UJI-CARI", mode: "insensitive" } },
  });
  console.log("hasil cari pegawai:", hasil.length);

  // grup + anggota
  const grup = await prisma.grup.create({
    data: { nama: "UJI-CARI Grup", anggota: { create: [{ userId: fungsional.id }] } },
    include: { anggota: true },
  });
  console.log("grup anggota:", grup.anggota.length);

  // dibagikan ke saya: share direktori ke role STAFF
  await prisma.shareEntry.create({
    data: { level: "VIEW", role: "STAFF", direktoriId: dir.id, createdBy: admin.id },
  });
  const shareStaff = await prisma.shareEntry.findMany({
    where: { OR: [{ role: "STAFF" }], direktoriId: dir.id },
  });
  console.log("share dibagikan (role STAFF):", shareStaff.length);

  // menu dinamis: nonaktifkan menu cari lalu aktifkan lagi
  await prisma.menuItem.update({ where: { key: "cari" }, data: { aktif: false } });
  const menusAktif = await prisma.menuItem.count({ where: { aktif: true } });
  await prisma.menuItem.update({ where: { key: "cari" }, data: { aktif: true } });
  console.log("menu aktif saat cari off:", menusAktif);
  const menusAktif2 = await prisma.menuItem.count({ where: { aktif: true } });
  console.log("menu aktif setelah on:", menusAktif2);

  // bersihkan
  await prisma.shareEntry.deleteMany({ where: { direktoriId: dir.id } });
  await prisma.arsipPegawai.deleteMany({ where: { direktoriId: dir.id } });
  await prisma.fileObj.delete({ where: { id: file.id } });
  await prisma.direktori.delete({ where: { id: dir.id } });
  await prisma.grup.delete({ where: { id: grup.id } });
  console.log("OK — bersih");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
