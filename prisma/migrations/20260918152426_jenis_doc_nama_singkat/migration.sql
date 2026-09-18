-- AlterTable: tambah kolom namaSingkat & keterangan
-- namaSingkat wajib diisi, jadi ditambahkan bertahap agar baris yang sudah ada
-- tetap valid (backfill dari kolom "nama").

ALTER TABLE "TaksonomiJenisDoc" ADD COLUMN "keterangan" TEXT;

ALTER TABLE "TaksonomiJenisDoc" ADD COLUMN "namaSingkat" TEXT;
UPDATE "TaksonomiJenisDoc" SET "namaSingkat" = "nama" WHERE "namaSingkat" IS NULL;
ALTER TABLE "TaksonomiJenisDoc" ALTER COLUMN "namaSingkat" SET NOT NULL;
