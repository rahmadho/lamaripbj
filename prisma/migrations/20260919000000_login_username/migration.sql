-- Login berpindah dari email ke username.
-- 1) Tambah kolom username (nullable dulu agar aman pada tabel berisi data).
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- 2) Backfill: pakai bagian lokal email (sebelum "@") sebagai basis username.
--    Email tetap dipertahankan sebagai data kontak (kini opsional).
UPDATE "User"
SET "username" = LOWER(SPLIT_PART("email", '@', 1))
WHERE "username" IS NULL;

-- 3) Fallback: bila ada baris tanpa email, pakai id agar tetap unik.
UPDATE "User"
SET "username" = LOWER("id")
WHERE "username" IS NULL;

-- 4) username wajib & unik.
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- 5) email tidak lagi unik & boleh kosong.
DROP INDEX IF EXISTS "User_email_key";
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
