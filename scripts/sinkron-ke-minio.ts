/**
 * Sinkronisasi file dari backend lokal ke MinIO.
 *
 * Skenario utama: aplikasi sudah berjalan lama dengan storage lokal (`STORAGE_DIR`),
 * lalu MinIO dipasang. Skrip ini meng-upload file fisik ke MinIO, memverifikasi
 * (ukuran + SHA-256), lalu mengalihkan `storedName` dari `local:<key>` ke `minio:<key>`.
 *
 * AMAN & IDEMPOTEN:
 * - `storedName` DB baru diubah SETELAH copy terverifikasi.
 * - File yang sudah berprefix `minio:` dilewati.
 * - Dapat dijalankan per-batch (`--limit`) dan diulang kapan saja.
 * - File lokal TIDAK dihapus (gunakan `--hapus-lokal` untuk membersihkan SETELAH
 *   semua terverifikasi; disk kini bebas — bukan kewajiban).
 *
 * Pemakaian:
 *   npx tsx scripts/sinkron-ke-minio.ts                        # pratinjau (dry-run)
 *   npx tsx scripts/sinkron-ke-minio.ts --apply                # eksekusi penuh
 *   npx tsx scripts/sinkron-ke-minio.ts --apply --limit 100    # bertahap 100 file
 *   npx tsx scripts/sinkron-ke-minio.ts --apply --hapus-lokal  # + hapus file lokal yg sukses
 */
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import { LocalStorageProvider } from "../src/lib/storage/local";
import { MinioStorageProvider } from "../src/lib/storage/minio";
import { buildStoredName } from "../src/lib/storage";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const HAPUS_LOKAL = args.includes("--hapus-lokal");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0;

const lokal = new LocalStorageProvider();
const minio = new MinioStorageProvider();

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

async function main() {
  const semua = await prisma.fileObj.findMany({
    select: { id: true, storedName: true, fileName: true, size: true },
    orderBy: { id: "asc" },
  });

  const kandidat = semua.filter((f) => {
    const i = f.storedName.indexOf(":");
    return i <= 0; // tanpa prefix (data lama) atau berprefix local:
  });
  const target = LIMIT > 0 ? kandidat.slice(0, LIMIT) : kandidat;

  console.log(`Total FileObj      : ${semua.length}`);
  console.log(`Perlu disinkron    : ${kandidat.length}${LIMIT > 0 ? ` (batch ini: ${target.length})` : ""}`);
  console.log(
    `Mode               : ${APPLY ? "APPLY" : "DRY-RUN (tambahkan --apply untuk eksekusi)"}` +
      (HAPUS_LOKAL ? " + hapus file lokal yang sukses" : "")
  );
  console.log();

  if (target.length === 0) {
    console.log("Tidak ada yang perlu disinkron.");
    return;
  }

  if (!APPLY) {
    for (const f of target.slice(0, 10)) {
      console.log(`  ${f.storedName}  ->  minio:${f.storedName}   (${f.fileName}, ${f.size} byte)`);
    }
    if (target.length > 10) console.log(`  … dan ${target.length - 10} lainnya`);
    console.log("\nPratinjau selesai. Jalankan ulang dengan --apply untuk mengeksekusi.");
    return;
  }

  // koneksi awal: gagal cepat bila MinIO belum siap
  try {
    await minio.put("__uji-koneksi__", Buffer.from("ok"));
    await minio.remove("__uji-koneksi__");
    console.log("Koneksi MinIO: OK\n");
  } catch (e) {
    console.error(`Koneksi MinIO GAGAL: ${(e as Error).message}`);
    console.error("Periksa MINIO_ENDPOINT / akses key di .env, lalu coba lagi.");
    process.exit(1);
  }

  let sukses = 0;
  let gagal = 0;
  for (const [i, f] of target.entries()) {
    const key = f.storedName.startsWith("local:") ? f.storedName.slice(6) : f.storedName;
    const label = `[${i + 1}/${target.length}] ${f.fileName}`;
    try {
      // baca lewat provider lokal (menghormati STORAGE_DIR + normalisasi key)
      const s = await lokal.getStream(key);
      const chunks: Buffer[] = [];
      for await (const c of s) chunks.push(c as Buffer);
      const isi = Buffer.concat(chunks);

      if (isi.length !== f.size) {
        throw new Error(`ukuran di disk (${isi.length}) ≠ metadata DB (${f.size})`);
      }
      const hash = sha256(isi);

      await minio.put(key, isi);

      // verifikasi: baca balik dari MinIO, bandingkan ukuran + checksum
      const ms = await minio.getStream(key);
      const mchunks: Buffer[] = [];
      for await (const c of ms) mchunks.push(c as Buffer);
      const kembali = Buffer.concat(mchunks);
      if (kembali.length !== f.size || sha256(kembali) !== hash) {
        throw new Error("verifikasi baca-balik dari MinIO tidak cocok");
      }

      // baru sekarang alihkan prefix di DB
      await prisma.fileObj.update({
        where: { id: f.id },
        data: { storedName: buildStoredName("minio", key) },
      });

      if (HAPUS_LOKAL) await lokal.remove(key);

      sukses++;
      console.log(`${label}  OK (${f.size} byte, sha ${hash.slice(0, 8)})`);
    } catch (e) {
      gagal++;
      console.error(`${label}  GAGAL: ${(e as Error).message}`);
    }
  }

  console.log(`\nSelesai. Sukses: ${sukses}, gagal: ${gagal}.`);
  if (gagal > 0) {
    console.log("File yang gagal TIDAK diubah prefix-nya — aman untuk diulang.");
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
