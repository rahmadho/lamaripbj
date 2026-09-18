// Hapus SEMUA data Arsip PBJ: dokumen, share, FileObj, file fisik, dan PaketPbj.
// Jalankan: npx tsx scripts/hapus-arsip-pbj.ts
import { prisma } from "../src/lib/db";
import { removeFile } from "../src/lib/storage";

async function main() {
  const arsip = await prisma.arsipPbj.findMany({
    select: { id: true, fileId: true, paketKode: true },
  });
  const paketCount = await prisma.paketPbj.count();
  console.log(`Ditemukan: ${arsip.length} dokumen ArsipPbj, ${paketCount} PaketPbj`);

  if (arsip.length === 0 && paketCount === 0) {
    console.log("Tidak ada data untuk dihapus.");
    return;
  }

  // 1) Hapus dokumen (ShareEntry ikut terhapus via cascade onDelete: Cascade)
  const delArsip = await prisma.arsipPbj.deleteMany({});
  console.log(`ArsipPbj dihapus: ${delArsip.count}`);

  // 2) Hapus FileObj yang menempel pada arsip PBJ (yang masih dipakai arsip pegawai tidak disentuh)
  const dipakaiPegawai = new Set(
    (await prisma.arsipPegawai.findMany({ select: { fileId: true } })).map((a) => a.fileId)
  );
  const fileIds = arsip.map((a) => a.fileId).filter((id) => !dipakaiPegawai.has(id));
  const files = await prisma.fileObj.findMany({
    where: { id: { in: fileIds } },
    select: { id: true, storedName: true },
  });
  const delFile = await prisma.fileObj.deleteMany({ where: { id: { in: fileIds } } });
  console.log(`FileObj dihapus: ${delFile.count}`);

  // 3) Hapus berkas fisik di storage (local/minio mengikuti prefix storedName)
  let hapusFisik = 0;
  for (const f of files) {
    try {
      await removeFile(f.storedName);
      hapusFisik++;
    } catch (e) {
      console.warn(`  Gagal hapus fisik ${f.storedName}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Berkas fisik dihapus: ${hapusFisik}/${files.length}`);

  // 4) Hapus paket induk
  const delPaket = await prisma.paketPbj.deleteMany({});
  console.log(`PaketPbj dihapus: ${delPaket.count}`);

  console.log("SELESAI — data Arsip PBJ bersih.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
