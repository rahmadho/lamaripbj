-- AlterTable
ALTER TABLE "ShareEntry" ADD COLUMN     "semuaUser" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ShareEntry_semuaUser_idx" ON "ShareEntry"("semuaUser");
