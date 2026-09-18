/**
 * Backfill prefix skema pada `FileObj.storedName`.
 *
 * Data lama (sebelum abstraksi storage) tidak punya prefix skema, sehingga
 * `parseStoredName` akan menganggapnya `local`. Skrip ini menambahkan prefix
 * eksplisit agar lokasi file tercatat jelas di DB.
 *
 * TIDAK memindahkan byte apa pun — hanya mengubah string di DB.
 * Idempoten: baris yang sudah berprefix dilewati.
 *
 * Pemakaian:
 *   npx tsx scripts/backfill-storage-prefix.ts                 # pratinjau (dry-run)
 *   npx tsx scripts/backfill-storage-prefix.ts --apply         # eksekusi
 *   npx tsx scripts/backfill-storage-prefix.ts --apply --skema local
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SKEMA_VALID = ["local", "minio"] as const;
type Skema = (typeof SKEMA_VALID)[number];

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const skemaArgIdx = args.indexOf("--skema");
const SKEMA: Skema = (skemaArgIdx >= 0 ? (args[skemaArgIdx + 1] as Skema) : "local") ?? "local";

function punyaPrefix(storedName: string): boolean {
  const idx = storedName.indexOf(":");
  if (idx <= 0) return false;
  return (SKEMA_VALID as readonly string[]).includes(storedName.slice(0, idx));
}

async function main() {
  if (!SKEMA_VALID.includes(SKEMA)) {
    console.error(`Skema "${SKEMA}" tidak dikenal. Pilih: ${SKEMA_VALID.join(", ")}`);
    process.exit(1);
  }

  const semua = await prisma.fileObj.findMany({
    select: { id: true, storedName: true, fileName: true },
    orderBy: { id: "asc" },
  });

  const perlu = semua.filter((f) => !punyaPrefix(f.storedName));
  const sudah = semua.length - perlu.length;

  console.log(`Total FileObj     : ${semua.length}`);
  console.log(`Sudah berprefix   : ${sudah}`);
  console.log(`Perlu di-backfill : ${perlu.length}  (akan jadi "${SKEMA}:<nama>")`);
  console.log(`Mode              : ${APPLY ? "APPLY" : "DRY-RUN (tambahkan --apply untuk eksekusi)"}`);
  console.log();

  if (perlu.length === 0) {
    console.log("Tidak ada yang perlu dikerjakan.");
    return;
  }

  for (const f of perlu.slice(0, 10)) {
    console.log(`  ${f.storedName}  ->  ${SKEMA}:${f.storedName}   (${f.fileName})`);
  }
  if (perlu.length > 10) console.log(`  … dan ${perlu.length - 10} lainnya`);

  if (!APPLY) {
    console.log("\nPratinjau selesai. Jalankan ulang dengan --apply untuk menerapkan.");
    return;
  }

  console.log("\nMenerapkan…");
  let berhasil = 0;
  for (const f of perlu) {
    await prisma.fileObj.update({
      where: { id: f.id },
      data: { storedName: `${SKEMA}:${f.storedName}` },
    });
    berhasil++;
  }
  console.log(`Selesai. ${berhasil} baris diperbarui.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
