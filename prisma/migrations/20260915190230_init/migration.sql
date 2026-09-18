-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PIMPINAN', 'PEJABAT_FUNGSIONAL', 'STAFF', 'UPLOADER');

-- CreateEnum
CREATE TYPE "JenisPengadaan" AS ENUM ('BARANG', 'KONSTRUKSI', 'JASA_KONSULTANSI', 'JASA_LAINNYA');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('VIEW', 'DOWNLOAD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Direktori" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "parentId" TEXT,
    "bolehUpload" BOOLEAN NOT NULL DEFAULT true,
    "uploadRoles" "Role"[],
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "Direktori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArsipPegawai" (
    "id" TEXT NOT NULL,
    "direktoriId" TEXT NOT NULL,
    "nomorDokumen" TEXT NOT NULL,
    "namaDokumen" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "fileId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArsipPegawai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaksonomiJenisDoc" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "TaksonomiJenisDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaksonomiPeta" (
    "id" TEXT NOT NULL,
    "jenisPengadaan" "JenisPengadaan",
    "metodePengadaan" TEXT,
    "taksonomiJenisDocId" TEXT NOT NULL,

    CONSTRAINT "TaksonomiPeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArsipPbj" (
    "id" TEXT NOT NULL,
    "paketKode" TEXT NOT NULL,
    "paketNama" TEXT NOT NULL,
    "jenisPengadaan" "JenisPengadaan" NOT NULL,
    "metodePengadaan" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "keterangan" TEXT,
    "taksonomiJenisDocId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArsipPbj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grup" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "Grup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupAnggota" (
    "grupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GrupAnggota_pkey" PRIMARY KEY ("grupId","userId")
);

-- CreateTable
CREATE TABLE "ShareEntry" (
    "id" TEXT NOT NULL,
    "level" "PermissionLevel" NOT NULL,
    "userId" TEXT,
    "grupId" TEXT,
    "role" "Role",
    "direktoriId" TEXT,
    "arsipPegawaiId" TEXT,
    "arsipPbjId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileObj" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileObj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT,
    "detail" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "icon" TEXT,
    "parentId" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "roles" "Role"[],

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Direktori_parentId_idx" ON "Direktori"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ArsipPegawai_fileId_key" ON "ArsipPegawai"("fileId");

-- CreateIndex
CREATE INDEX "ArsipPegawai_direktoriId_idx" ON "ArsipPegawai"("direktoriId");

-- CreateIndex
CREATE INDEX "ArsipPegawai_nomorDokumen_idx" ON "ArsipPegawai"("nomorDokumen");

-- CreateIndex
CREATE UNIQUE INDEX "TaksonomiJenisDoc_nama_key" ON "TaksonomiJenisDoc"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "TaksonomiPeta_jenisPengadaan_metodePengadaan_taksonomiJenis_key" ON "TaksonomiPeta"("jenisPengadaan", "metodePengadaan", "taksonomiJenisDocId");

-- CreateIndex
CREATE UNIQUE INDEX "ArsipPbj_fileId_key" ON "ArsipPbj"("fileId");

-- CreateIndex
CREATE INDEX "ArsipPbj_jenisPengadaan_metodePengadaan_tahun_idx" ON "ArsipPbj"("jenisPengadaan", "metodePengadaan", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "ArsipPbj_paketKode_taksonomiJenisDocId_key" ON "ArsipPbj"("paketKode", "taksonomiJenisDocId");

-- CreateIndex
CREATE UNIQUE INDEX "Grup_nama_key" ON "Grup"("nama");

-- CreateIndex
CREATE INDEX "ShareEntry_userId_idx" ON "ShareEntry"("userId");

-- CreateIndex
CREATE INDEX "ShareEntry_grupId_idx" ON "ShareEntry"("grupId");

-- CreateIndex
CREATE INDEX "ShareEntry_role_idx" ON "ShareEntry"("role");

-- CreateIndex
CREATE UNIQUE INDEX "FileObj_storedName_key" ON "FileObj"("storedName");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_key_key" ON "MenuItem"("key");

-- CreateIndex
CREATE INDEX "MenuItem_parentId_idx" ON "MenuItem"("parentId");

-- AddForeignKey
ALTER TABLE "Direktori" ADD CONSTRAINT "Direktori_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Direktori"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direktori" ADD CONSTRAINT "Direktori_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArsipPegawai" ADD CONSTRAINT "ArsipPegawai_direktoriId_fkey" FOREIGN KEY ("direktoriId") REFERENCES "Direktori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArsipPegawai" ADD CONSTRAINT "ArsipPegawai_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObj"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArsipPegawai" ADD CONSTRAINT "ArsipPegawai_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaksonomiPeta" ADD CONSTRAINT "TaksonomiPeta_taksonomiJenisDocId_fkey" FOREIGN KEY ("taksonomiJenisDocId") REFERENCES "TaksonomiJenisDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArsipPbj" ADD CONSTRAINT "ArsipPbj_taksonomiJenisDocId_fkey" FOREIGN KEY ("taksonomiJenisDocId") REFERENCES "TaksonomiJenisDoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArsipPbj" ADD CONSTRAINT "ArsipPbj_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObj"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArsipPbj" ADD CONSTRAINT "ArsipPbj_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupAnggota" ADD CONSTRAINT "GrupAnggota_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "Grup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupAnggota" ADD CONSTRAINT "GrupAnggota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareEntry" ADD CONSTRAINT "ShareEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareEntry" ADD CONSTRAINT "ShareEntry_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "Grup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareEntry" ADD CONSTRAINT "ShareEntry_direktoriId_fkey" FOREIGN KEY ("direktoriId") REFERENCES "Direktori"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareEntry" ADD CONSTRAINT "ShareEntry_arsipPegawaiId_fkey" FOREIGN KEY ("arsipPegawaiId") REFERENCES "ArsipPegawai"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareEntry" ADD CONSTRAINT "ShareEntry_arsipPbjId_fkey" FOREIGN KEY ("arsipPbjId") REFERENCES "ArsipPbj"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
