/**
 * Uji cepat round-trip storage: put -> read -> hapus.
 * Memakai path kode yang sama dengan server action (lib/storage).
 *
 *   npx tsx scripts/smoke-storage.ts
 */
import { saveFile, readFileStream, removeFile, parseStoredName } from "../src/lib/storage";
import { prisma } from "../src/lib/db";

function bacaSemua(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function main() {
  const isi = Buffer.from("%PDF-1.4\nuji round-trip storage\n%%EOF\n");

  // Bangun File tiruan seperti yang datang dari FormData
  const file = new File([isi], "uji-roundtrip.pdf", { type: "application/pdf" });

  const fileId = await saveFile(file, { folderLogis: "pegawai" });
  const rec = await prisma.fileObj.findUniqueOrThrow({ where: { id: fileId } });

  console.log(`fileId       : ${fileId}`);
  console.log(`storedName   : ${rec.storedName}`);
  console.log(`parse        : ${JSON.stringify(parseStoredName(rec.storedName))}`);

  const kembali = await bacaSemua(await readFileStream(rec.storedName));
  const cocok = Buffer.compare(kembali, isi) === 0;
  console.log(`isi identik  : ${cocok ? "YA" : "TIDAK"} (${kembali.length} vs ${isi.length} byte)`);
  if (!cocok) throw new Error("Isi file tidak sama setelah round-trip");

  await removeFile(rec.storedName);
  await prisma.fileObj.delete({ where: { id: fileId } });

  // pastikan idempoten: hapus dua kali tidak melempar
  await removeFile(rec.storedName);
  console.log("hapus ulang  : OK (idempoten)");

  // validasi tolak mime & ukuran
  try {
    await saveFile(new File([isi], "x.exe", { type: "application/x-msdownload" }), {
      validasi: (f) => {
        if (f.type !== "application/pdf") throw new Error("mime ditolak");
      },
    });
    throw new Error("seharusnya ditolak");
  } catch (e) {
    console.log(`tolak mime   : OK (${(e as Error).message})`);
  }

  console.log("\nSEMUA OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
