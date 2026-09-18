# LAMARI — Aplikasi Arsip Kantor

Aplikasi arsip digital untuk kebutuhan kantor (UKPBJ) dengan dua modul terpisah:
**Arsip Pegawai** (direktori bertingkat) dan **Arsip PBJ** (dokumen pengadaan
terintegrasi API Sipedal). Dibangun dengan Next.js 16, PostgreSQL, Prisma, dan
Auth.js v5.

## Fitur Utama

### Modul Arsip Pegawai
- Direktori bertingkat seperti file explorer (subdirektori tak terbatas)
- Metadata folder: deskripsi, tanggal buat/ubah, creator
- Pengaturan per folder: `bolehUpload`, batasan role pengunggah
- Arsip: nomor dokumen, nama, tanggal, file (maks 25 MB)
- Share granular multi-pilih: **Lihat, Tambah Subdirektori, Upload, Download, Delete**
  (dengan peringatan khusus untuk izin Delete)
- Aturan izin subdirektori dapat meng-override induk

### Modul Arsip PBJ
- Data paket diambil **langsung dari API Sipedal**
  (`sipedal.sumbarprov.go.id/api/v1/arsip/paket/{KODE}?type=1|2|3`)
  — 1 Tender, 2 Nontender, 3 e-Katalog
- Pemetaan otomatis jenis & metode pengadaan dari respons API
- **Unggah banyak dokumen sekaligus** per paket: semua jenis dokumen yang
  diharapkan tampil sebagai daftar, tinggal pilih berkas per baris
- Dokumen pelengkap: slot yang belum diunggah tampil di list, tinggal klik
  **Lengkapi**
- Taksonomi jenis dokumen dengan semantik **OR** (jenis pengadaan dan/atau
  metode pengadaan)
- Share ke **grup dan/atau perorangan** sekaligus (multi-pilih)

### Lintas modul
- Role: **Admin, Pimpinan, Pejabat Fungsional, Staff, Uploader**
  (Uploader khusus Arsip PBJ + Taksonomi)
- Grup berisi Pejabat Fungsional; anggota grup mewarisi akses arsip
- Menu & hak akses dinamis, dikonfigurasi dari halaman admin
- Pencarian lintas modul, halaman "Dibagikan kepada saya", export CSV,
  audit log, dashboard statistik
- Profil pengguna (data diri + ganti password sendiri)
- Halaman publik: Panduan, Hubungi Kami, integrasi link SPSE & Sipedal
- Dark theme + tema terang (Institutional Bureau)

## Tumpukan Teknologi

| Komponen | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, `proxy.ts`) |
| Bahasa | TypeScript |
| Database | PostgreSQL 13 + Prisma v6 |
| Auth | Auth.js v5 (credentials + bcryptjs) |
| UI | Tailwind CSS v4, shadcn (Base UI), lucide-react |
| Storage | Filesystem lokal (default) atau MinIO — switch via env |
| Test | Vitest (57 test) |

## Struktur Proyek

```
app/
├── prisma/              # schema.prisma + migrasi + seed
├── src/
│   ├── app/             # halaman (App Router) + API routes
│   ├── components/      # komponen UI
│   ├── lib/             # auth, acl, storage, paket (Sipedal), pbj, validators
│   └── server/          # actions & queries (server-only)
├── docs/                # DEPLOY-DOCKER.md, BACKUP.md, STORAGE.md
├── scripts/             # backup, smoke test, migrasi storage
└── tests/               # unit test vitest
storage/                 # file upload (di luar webroot, level repo root)
```

## Menjalankan untuk Development

### 1. Prasyarat
- Node.js 20+
- PostgreSQL 13 (Laragon / instalasi native / Docker)
- Windows: jalankan perintah di Git Bash

### 2. Konfigurasi environment
Buat `app/.env`:
```env
DATABASE_URL="postgresql://postgres@localhost:5432/arsip"
AUTH_SECRET="hasil-npx-auth-secret"
AUTH_TRUST_HOST="true"
STORAGE_DIR="G:/PBJ/lamari/storage"

# Sumber data paket pengadaan (API Sipedal)
SIPEDAL_API_BASE=https://sipedal.sumbarprov.go.id/api/v1/arsip/paket
SIPEDAL_API_TIMEOUT=8000

# (opsional) backend MinIO — default local
# STORAGE_BACKEND="minio"
# MINIO_ENDPOINT="localhost"
# MINIO_PORT="9000"
# MINIO_USE_SSL="false"
# MINIO_ACCESS_KEY="..."
# MINIO_SECRET_KEY="..."
# MINIO_BUCKET="arsip"
```
Generate `AUTH_SECRET` dengan:
```bash
npx auth secret
```

### 3. Siapkan database
```bash
cd app
npx prisma generate
npx prisma migrate dev     # terapkan semua migrasi
npm run db:seed            # data awal: user, taksonomi, menu (DB kosong saja)
```

### 4. Jalankan
```bash
npm run dev                # http://localhost:3000
```

### Akun seed (password semua: `password123`)
| Email | Role |
|---|---|
| `admin@kantor.go.id` | Admin |
| `pimpinan@kantor.go.id` | Pimpinan |
| `fungsional@kantor.go.id` | Pejabat Fungsional |
| `staff@kantor.go.id` | Staff |
| `uploader@kantor.go.id` | Uploader |

> **Ganti password seed sebelum dipakai di lingkungan sungguhan.**

### Perintah lain
```bash
npm run lint               # eslint
npx tsc --noEmit           # cek tipe
npm test                   # vitest (57 test)
npm run build              # build produksi
```

## Deploy Produksi

### Opsi A — Docker (disarankan)
Panduan lengkap dengan **pembatasan resource CPU/RAM** dan runtime
**Distroless hardened**: lihat [docs/DEPLOY-DOCKER.md](./docs/DEPLOY-DOCKER.md).

PostgreSQL & MinIO **tidak dibuat** oleh compose — keduanya sudah berjalan
sebagai container lain di network eksternal (`db-network` & `app-network`).

Ringkas:
```bash
cd app
cp .env.docker.example .env     # isi DATABASE_URL (host = nama container Postgres) & AUTH_SECRET
docker compose up -d --build    # hanya service app
```
Entrypoint otomatis menunggu DB siap → `prisma migrate deploy` → seed
(bila `DB_SEED=true`) → `node server.js`.

### Opsi B — Manual (tanpa Docker)
```bash
cd app
npm ci
npx prisma migrate deploy     # JANGAN migrate dev di produksi
npm run build
npm start                     # atau jalankan via PM2/systemd
```
Pastikan env produksi terisi lengkap (lihat bagian environment di atas).

### Checklist go-live
1. Ganti semua password akun seed
2. `AUTH_SECRET` unik dan tidak berubah antar-deploy
3. Backup terjadwal aktif (lihat bawah)
4. `SIPEDAL_API_BASE` dapat dijangkau dari server
5. Volume/`STORAGE_DIR` berada di disk yang dipantau kapasitasnya

## Backup & Restore

Database **dan** folder storage wajib dicadangkan bersamaan — panduan lengkap
di [docs/BACKUP.md](./docs/BACKUP.md).

```bash
bash scripts/backup.sh        # Git Bash
scripts\backup.bat            # Task Scheduler Windows
```
Hasil di `backups/<tanggal>/` (dump SQL + tar.gz storage), retensi default
14 hari. Termasuk prosedur restore & uji restore bulanan.

## Penyimpanan File (Local ↔ MinIO)

Arsitektur storage terabstraksi — pindah backend **tanpa mengubah kode** dan
**tanpa kehilangan file lama**; file lokal & MinIO dapat hidup berdampingan
selama migrasi. Panduan lengkap: [docs/STORAGE.md](./docs/STORAGE.md).

```env
STORAGE_BACKEND="minio"       # default: local
```
Migrasi bertahap: `scripts/sinkron-ke-minio.ts` memindahkan file lama dengan
verifikasi SHA-256 per berkas, lalu alihkan pointer DB.

## Integrasi Eksternal

| Layanan | Kegunaan | Konfigurasi |
|---|---|---|
| **Sipedal** | Sumber data paket pengadaan (lookup by kode + tipe) | `SIPEDAL_API_BASE`, `SIPEDAL_API_TIMEOUT` |
| **SPSE** | Link keluar di halaman login/hubungi kami | statis |

> Catatan: endpoint `type=3` (e-Katalog) Sipedal sempat mengalami error SQL di
> sisi mereka — aplikasi tetap aman (mengembalikan "tidak ditemukan", tidak crash).

## Keamanan

- Password di-hash bcryptjs; sesi via Auth.js
- Rate limit login 5 percobaan/menit per IP
- ACL berlapis: owner → user → role → grup; izin subdirektori meng-override induk
- Validasi file: whitelist MIME + maks 25 MB; nama fisik file di-random (UUID)
- File disimpan **di luar webroot**; akses hanya via endpoint terproteksi + audit
- Server action selalu memvalidasi ulang data paket ke API (tidak percaya klien)
- Audit log untuk aksi penting (login, CRUD arsip, share, unduh)

## Struktur Hak Akses (Ringkas)

| Objek | Admin | Pimpinan | Pejabat Fungsional | Staff | Uploader |
|---|---|---|---|---|---|
| Arsip Pegawai | semua | via share | via share | via share | ✗ |
| Arsip PBJ | semua | semua (lihat) | via grup/user | via grup/user | upload + taksonomi |
| Konfigurasi menu/user/grup | ✓ | ✗ | ✗ | ✗ | ✗ |

## Troubleshooting Cepat

| Gejala | Solusi |
|---|---|
| `P1001: Can't reach database` | PostgreSQL belum jalan / `DATABASE_URL` salah |
| Login gagal terus | `AUTH_SECRET` berubah → sesi invalid; cek juga rate limit |
| Upload gagal `Tipe file tidak diizinkan` | hanya PDF/gambar/Office yang diizinkan |
| Paket tidak ditemukan | cek kode & tipe sumber data (1/2/3); lihat catatan Sipedal di atas |
| File lama tak terbaca setelah switch MinIO | `STORAGE_DIR` salah / file terhapus; baca docs/STORAGE.md |

## Dokumentasi Terkait

- [docs/DEPLOY-DOCKER.md](./docs/DEPLOY-DOCKER.md) — deploy Docker + resource limit
- [docs/BACKUP.md](./docs/BACKUP.md) — backup, restore, retensi
- [docs/STORAGE.md](./docs/STORAGE.md) — arsitektur storage & migrasi MinIO
- [../DESIGN.md](../DESIGN.md) — design system "Institutional Bureau"
- [../TODO.md](../TODO.md) — riwayat pengembangan per fase
