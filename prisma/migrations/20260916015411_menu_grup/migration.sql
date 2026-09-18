-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "grup" TEXT;

-- CreateIndex
CREATE INDEX "MenuItem_grup_idx" ON "MenuItem"("grup");
