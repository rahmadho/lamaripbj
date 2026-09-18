import { PrismaClient } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const STORAGE_DIR = process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage");

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@kantor.go.id" } });
  await mkdir(STORAGE_DIR, { recursive: true });

  const storedName = "uji-unduh.txt";
  await writeFile(path.join(STORAGE_DIR, storedName), "halo arsip");

  const file = await prisma.fileObj.create({
    data: { fileName: "uji-unduh.txt", storedName, mimeType: "text/plain", size: 10 },
  });
  const dir = await prisma.direktori.create({
    data: { nama: "UJI-Unduh", ownerId: admin.id },
  });
  const arsip = await prisma.arsipPegawai.create({
    data: {
      direktoriId: dir.id,
      nomorDokumen: "UJI-UNDUH-1",
      namaDokumen: "Uji Unduh",
      tanggal: new Date(),
      fileId: file.id,
      createdById: admin.id,
    },
  });
  console.log(`FILEID=${file.id}`);
  console.log(`ARSLIP=${arsip.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
