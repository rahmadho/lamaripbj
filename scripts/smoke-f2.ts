import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });

  await prisma.arsipPegawai.deleteMany({ where: { direktori: { nama: { startsWith: "UJI-" } } } });
  await prisma.direktori.deleteMany({ where: { nama: { startsWith: "UJI-" } } });

  const root = await prisma.direktori.create({
    data: { nama: "UJI-Kepegawaian", deskripsi: "uji", ownerId: admin.id, bolehUpload: true },
  });
  const child = await prisma.direktori.create({
    data: { nama: "UJI-SK", parentId: root.id, ownerId: admin.id, bolehUpload: false },
  });

  const file = await prisma.fileObj.create({
    data: { fileName: "sk.pdf", storedName: "uji-sk.pdf", mimeType: "application/pdf", size: 1234 },
  });
  const arsip = await prisma.arsipPegawai.create({
    data: {
      direktoriId: root.id,
      nomorDokumen: "SK-001",
      namaDokumen: "SK Uji",
      tanggal: new Date(),
      fileId: file.id,
      createdById: admin.id,
    },
  });

  await prisma.shareEntry.create({
    data: { level: "VIEW", role: "STAFF", direktoriId: root.id, createdBy: admin.id },
  });

  console.log("dibuat:", { root: root.id, child: child.id, arsip: arsip.id });

  const staffShare = await prisma.shareEntry.findFirst({
    where: { role: "STAFF", direktoriId: root.id, level: "VIEW" },
  });
  console.log("share staff VIEW:", !!staffShare);
  console.log("child bolehUpload:", child.bolehUpload);

  const audits = await prisma.auditLog.count();
  console.log("jumlah audit log:", audits);

  const linked = await prisma.fileObj.findUnique({
    where: { id: file.id },
    include: { arsipPegawai: { select: { id: true } } },
  });
  console.log("file terhubung ke arsip:", linked?.arsipPegawai?.id === arsip.id);

  await prisma.arsipPegawai.delete({ where: { id: arsip.id } });
  await prisma.fileObj.delete({ where: { id: file.id } });
  await prisma.direktori.delete({ where: { id: child.id } });
  await prisma.direktori.delete({ where: { id: root.id } });
  console.log("OK — bersih");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
