-- AlterTable
ALTER TABLE "ArsipPbj" ADD COLUMN     "paketId" TEXT;

-- CreateTable
CREATE TABLE "PaketPbj" (
    "id" TEXT NOT NULL,
    "paketKode" TEXT NOT NULL,
    "paketNama" TEXT NOT NULL,
    "jenisPengadaan" "JenisPengadaan" NOT NULL,
    "metodePengadaan" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "keterangan" TEXT,
    "grupId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaketPbj_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaketPbj_grupId_idx" ON "PaketPbj"("grupId");

-- CreateIndex
CREATE UNIQUE INDEX "PaketPbj_paketKode_tahun_key" ON "PaketPbj"("paketKode", "tahun");

-- CreateIndex
CREATE INDEX "ArsipPbj_paketId_idx" ON "ArsipPbj"("paketId");

-- AddForeignKey
ALTER TABLE "PaketPbj" ADD CONSTRAINT "PaketPbj_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaketPbj" ADD CONSTRAINT "PaketPbj_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "Grup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArsipPbj" ADD CONSTRAINT "ArsipPbj_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES "PaketPbj"("id") ON DELETE SET NULL ON UPDATE CASCADE;
