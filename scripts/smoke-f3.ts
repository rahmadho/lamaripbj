import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });
  const fungsional = await prisma.user.findUniqueOrThrow({
    where: { username: "fungsional" },
  });
  const staff = await prisma.user.findUniqueOrThrow({ where: { username: "staff" } });

  // bersihkan sisa uji
  await prisma.arsipPbj.deleteMany({ where: { paketKode: { startsWith: "UJI-" } } });
  await prisma.grup.deleteMany({ where: { nama: { startsWith: "UJI-Grup" } } });

  // grup berisi Pejabat Fungsional
  const grup = await prisma.grup.create({
    data: {
      nama: "UJI-Grup Pengadaan",
      anggota: { create: [{ userId: fungsional.id }] },
    },
  });

  // peta spesifik: jenis dokumen hanya utk BARANG+TENDER
  const doc = await prisma.taksonomiJenisDoc.create({
    data: { nama: "UJI-Doc Tender Barang", namaSingkat: "UJI-BA" },
  });
  await prisma.taksonomiPeta.create({
    data: { taksonomiJenisDocId: doc.id, jenisPengadaan: "BARANG", metodePengadaan: "TENDER" },
  });

  const file = await prisma.fileObj.create({
    data: { fileName: "ba.pdf", storedName: "uji-ba.pdf", mimeType: "application/pdf", size: 100 },
  });
  const arsip = await prisma.arsipPbj.create({
    data: {
      paketKode: "UJI-PKT-1",
      paketNama: "Paket Uji",
      jenisPengadaan: "BARANG",
      metodePengadaan: "TENDER",
      tahun: 2026,
      taksonomiJenisDocId: doc.id,
      fileId: file.id,
      createdById: admin.id,
    },
  });

  // share arsip PBJ ke grup
  await prisma.shareEntry.create({
    data: { level: "DOWNLOAD", grupId: grup.id, arsipPbjId: arsip.id, createdBy: admin.id },
  });

  // verifikasi: fungsional (anggota grup) dapat akses
  const aksesGrup = await prisma.shareEntry.findFirst({
    where: {
      arsipPbjId: arsip.id,
      grup: { anggota: { some: { userId: fungsional.id } } },
    },
  });
  console.log("fungsional akses via grup:", !!aksesGrup);

  // staff bukan anggota → tidak ada share
  const aksesStaff = await prisma.shareEntry.findFirst({
    where: { arsipPbjId: arsip.id, userId: staff.id },
  });
  console.log("staff akses (harus false):", !!aksesStaff);

  // filter jenis dokumen cocok utk BARANG+TENDER
  const cocok = await prisma.taksonomiPeta.findMany({
    where: {
      OR: [
        { jenisPengadaan: null, metodePengadaan: null },
        { jenisPengadaan: "BARANG", metodePengadaan: null },
        { jenisPengadaan: null, metodePengadaan: "TENDER" },
        { jenisPengadaan: "BARANG", metodePengadaan: "TENDER" },
      ],
    },
  });
  console.log("peta cocok (termasuk spesifik):", cocok.some((c) => c.taksonomiJenisDocId === doc.id));

  // bersihkan
  await prisma.shareEntry.deleteMany({ where: { arsipPbjId: arsip.id } });
  await prisma.arsipPbj.delete({ where: { id: arsip.id } });
  await prisma.fileObj.delete({ where: { id: file.id } });
  await prisma.taksonomiJenisDoc.delete({ where: { id: doc.id } });
  await prisma.grup.delete({ where: { id: grup.id } });
  console.log("OK — bersih");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
