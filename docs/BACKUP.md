# Backup & Restore — Aplikasi Arsip

Dokumen ini menjelaskan cara mencadangkan (backup) dan memulihkan (restore) data
aplikasi arsip. Ada **dua komponen** yang wajib dicadangkan bersamaan:

| Komponen | Isi | Sumber |
|---|---|---|
| Database PostgreSQL | metadata arsip, direktori, user, role, grup, menu, share, audit log | `pg_dump` |
| Folder storage | file fisik arsip (hasil upload) | `$STORAGE_DIR` (default `G:\PBJ\lamari\storage`) |

> Penting: database dan storage harus di-backup pada waktu yang sama. Jika salah satu
> hilang, ada metadata tanpa file atau file tanpa metadata.

> Jika Anda bermigrasi ke backend object storage (MinIO/S3), folder `$STORAGE_DIR`
> hanya memuat file **lama**. File baru di MinIO perlu dicadangkan dengan `mc mirror`.
> Lihat **[STORAGE.md](./STORAGE.md)** bagian migrasi.

---

## 1. Menjalankan Backup

### Windows (Git Bash)
```bash
cd G:/PBJ/lamari/app
bash scripts/backup.sh
```

### Windows (CMD / Task Scheduler)
```bat
scripts\backup.bat
```

### Konfigurasi (opsional, lewat env)
| Env | Default | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres@localhost:5432/arsip` | koneksi DB |
| `STORAGE_DIR` | `<repo>/storage` | folder file arsip |
| `BACKUP_DIR` | `<repo>/backups` | lokasi hasil backup |
| `PG_DUMP` | auto (Laragon) / `pg_dump` | path binary pg_dump |
| `SIMPAN_HARI` | `14` | hapus backup lebih tua dari N hari (0 = nonaktif) |

### Hasil
```
backups/
└── 2025-01-15/
    ├── arsip-083012.sql        # dump database
    └── storage-083012.tar.gz   # arsip folder file
```

## 2. Jadwal Otomatis (harian)

### Windows Task Scheduler
```
schtasks /Create /TN "Backup Arsip" /SC DAILY /ST 23:00 ^
  /TR "G:\PBJ\lamari\app\scripts\backup.bat"
```

### Linux (cron)
```cron
0 23 * * * cd /srv/lamari/app && bash scripts/backup.sh >> /var/log/lamari-backup.log 2>&1
```

Disarankan juga menyalin folder `backups/` ke lokasi lain (NAS / cloud / disk luar)
minimal seminggu sekali, karena backup di mesin yang sama tidak melindungi dari
kerusakan disk.

---

## 3. Restore

### 3.1 Database
```bash
# Buat DB baru (kosong) bila perlu
createdb -h localhost -U postgres arsip_restore

# Muat dump
psql -h localhost -U postgres -d arsip_restore -f backups/2025-01-15/arsip-083012.sql

# Arahkan aplikasi ke DB hasil restore lewat DATABASE_URL, lalu jalankan:
cd G:/PBJ/lamari/app
npx prisma migrate deploy   # pastikan skema sesuai
```

### 3.2 Folder storage
```bash
# Hentikan aplikasi dulu, lalu:
cd G:/PBJ/lamari
rm -rf storage            # HATI-HATI: hanya jika yakin akan diganti
tar -xzf app/backups/2025-01-15/storage-083012.tar.gz -C G:/PBJ/lamari
```

Pastikan `STORAGE_DIR` pada `.env` mengarah ke folder yang baru dipulihkan.

### 3.3 Verifikasi pasca-restore
1. Login sebagai admin, buka `/dashboard` — statistik harus masuk akal.
2. Buka **Arsip Pegawai** dan **Arsip PBJ**, klik unduh satu file dari masing-masing.
3. Cek `/audit-log` memuat riwayat lama.
4. Cek menu dinamis di sidebar muncul (`/menu`).
5. Uji login user non-admin (`pimpinan@`, `staff@`, dst.).

---

## 4. Uji Backup (disarankan tiap bulan)
Jangan tunggu bencana untuk tahu backup rusak. Lakukan **uji restore ke DB
sementara** minimal sebulan sekali:
```bash
createdb -h localhost -U postgres arsip_uji
psql -h localhost -U postgres -d arsip_uji -f backups/<tgl>/arsip-<jam>.sql
# bandingkan jumlah baris tabel kunci
psql -h localhost -U postgres -d arsip_uji -c "SELECT count(*) FROM \"ArsipPegawai\";"
psql -h localhost -U postgres -d arsip_uji -c "SELECT count(*) FROM \"ArsipPbj\";"
dropdb -h localhost -U postgres arsip_uji
```

---

## 5. Retensi
- Default: backup disimpan **14 hari** (`SIMPAN_HARI`).
- Untuk kepatuhan arsip kantor, pertimbangkan retensi lebih panjang pada salinan
  off-site (mis. simpan bulanan selama 1 tahun).
