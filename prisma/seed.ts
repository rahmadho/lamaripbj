import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MENUS = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", urutan: 0 },
  { key: "cari", label: "Pencarian", path: "/cari", urutan: 1, grup: "Telusur" },
  { key: "arsip-pegawai", label: "Arsip Pegawai", path: "/arsip-pegawai", urutan: 2, grup: "Arsip", roles: ["ADMIN", "PIMPINAN", "PEJABAT_FUNGSIONAL", "STAFF"] },
  { key: "arsip-pbj", label: "Arsip PBJ", path: "/arsip-pbj", urutan: 3, grup: "Arsip" },
  { key: "dibagikan", label: "Dibagikan ke Saya", path: "/dibagikan", urutan: 4, grup: "Telusur" },
  { key: "grup", label: "Grup", path: "/grup", urutan: 5, grup: "Administrasi", roles: ["ADMIN"] },
  { key: "taksonomi", label: "Taksonomi Dokumen", path: "/taksonomi", urutan: 6, grup: "Administrasi", roles: ["ADMIN", "UPLOADER"] },
  { key: "menu", label: "Konfigurasi Menu", path: "/menu", urutan: 7, grup: "Administrasi", roles: ["ADMIN"] },
  { key: "pengguna", label: "Pengguna", path: "/pengguna", urutan: 8, grup: "Administrasi", roles: ["ADMIN"] },
  { key: "audit-log", label: "Audit Log", path: "/audit-log", urutan: 9, grup: "Administrasi", roles: ["ADMIN"] },
];

const JENIS_DOC = [
  { nama: "Berita Acara Review", namaSingkat: "BAR", keterangan: "Berita acara hasil review dokumen pengadaan" },
  { nama: "Surat Pengantar & Disposisi", namaSingkat: "SPD", keterangan: "Surat pengantar beserta lembar disposisi" },
  { nama: "Berita Acara Evaluasi", namaSingkat: "BAE", keterangan: "Berita acara evaluasi penawaran" },
  { nama: "Berita Acara Negosiasi", namaSingkat: "BAN", keterangan: "Berita acara negosiasi harga" },
  { nama: "Kontrak", namaSingkat: "KTR", keterangan: "Dokumen kontrak / perjanjian pengadaan" },
  { nama: "SPPBJ", namaSingkat: "SPPBJ", keterangan: "Surat Perintah Penunjukan Barang/Jasa" },
  { nama: "Dokumen Penawaran", namaSingkat: "DOKPEN", keterangan: "Dokumen penawaran dari penyedia" },
];

async function main() {
  const pass = await bcrypt.hash("password123", 10);

  const users = [
    { nama: "Admin", username: "admin", email: "admin@kantor.go.id", role: "ADMIN" as const },
    { nama: "Pimpinan", username: "pimpinan", email: "pimpinan@kantor.go.id", role: "PIMPINAN" as const },
    { nama: "Pejabat Fungsional", username: "fungsional", email: "fungsional@kantor.go.id", role: "PEJABAT_FUNGSIONAL" as const },
    { nama: "Pejabat Fungsional 2", username: "fungsional2", email: "fungsional2@kantor.go.id", role: "PEJABAT_FUNGSIONAL" as const },
    { nama: "Pejabat Fungsional 3", username: "fungsional3", email: "fungsional3@kantor.go.id", role: "PEJABAT_FUNGSIONAL" as const },
    { nama: "Staff", username: "staff", email: "staff@kantor.go.id", role: "STAFF" as const },
    { nama: "Uploader", username: "uploader", email: "uploader@kantor.go.id", role: "UPLOADER" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: pass },
      create: { ...u, passwordHash: pass },
    });
  }

  // menu dinamis
  for (const m of MENUS) {
    const { roles, ...data } = m as typeof m & { roles?: string[] };
    await prisma.menuItem.upsert({
      where: { key: m.key },
      update: { ...data, roles: (roles as never[]) ?? [] },
      create: {
        ...data,
        roles: (roles as never[]) ?? [],
      },
    });
  }

  // taksonomi jenis dokumen
  // taksonomi jenis dokumen
  const metodeList = ["TENDER", "SELEKSI", "PENUNJUKAN_LANGSUNG", "PENGADAAN_LANGSUNG", "E_PURCHASING"];
  for (const doc of JENIS_DOC) {
    await prisma.taksonomiJenisDoc.upsert({
      where: { nama: doc.nama },
      update: { namaSingkat: doc.namaSingkat, keterangan: doc.keterangan },
      create: doc,
    });
  }
  const allDocs = await prisma.taksonomiJenisDoc.findMany();
  // ponytail: pemetaan umum (berlaku semua jenis & metode) — perinci per kombinasi saat kebutuhan nyata muncul
  for (const doc of allDocs) {
    const existing = await prisma.taksonomiPeta.findFirst({
      where: { taksonomiJenisDocId: doc.id, jenisPengadaan: null, metodePengadaan: null },
    });
    if (!existing) {
      await prisma.taksonomiPeta.create({ data: { taksonomiJenisDocId: doc.id } });
    }
  }

  // ponytail: paket dummy di-level provider (src/lib/paket.ts) — seed DB tidak perlu
  console.log("Seed selesai.");
  console.log("Login: admin / password123 (role lain sama pattern)");
  console.log("Metode pengadaan tersedia:", metodeList.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
