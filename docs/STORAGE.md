# Penyimpanan File (Storage) — Aplikasi Arsip

Dokumen ini menjelaskan arsitektur penyimpanan file arsip, cara menambah backend
baru (mis. MinIO), dan cara migrasi **tanpa kehilangan file lama**.

---

## 1. Arsitektur

Penyimpanan diabstraksi lewat interface `StorageProvider`
(`src/lib/storage/types.ts`):

```ts
interface StorageProvider {
  readonly nama: string;                              // "local" | "minio" | …
  put(key: string, data: Buffer): Promise<void>;      // simpan objek
  getStream(key: string): Promise<Readable>;          // baca objek
  remove(key: string): Promise<void>;                 // hapus objek
}
```

Implementasi yang tersedia:

| Backend | File | Status |
|---|---|---|
| `local` (filesystem) | `src/lib/storage/local.ts` | ✅ aktif — default |
| `minio` (S3-compatible) | `src/lib/storage/minio.ts` | ✅ siap — aktifkan via `STORAGE_BACKEND` |

Kode pemanggil **tidak pernah** menyentuh provider langsung. Semuanya lewat
`src/lib/storage/index.ts`:

| Fungsi | Kegunaan |
|---|---|
| `saveFile(file, opts)` | simpan file, kembalikan id `FileObj` |
| `readFileStream(storedName)` | **async** — buka stream baca |
| `removeFile(storedName)` | hapus objek fisik (idempoten) |
| `fileExists(storedName)` | cek keberadaan objek |
| `validateFile(file)` | validasi MIME + ukuran (25 MB) |

> `readFileStream` bersifat **async**. Provider object storage mengembalikan
> Promise, jadi pemanggil wajib `await`.

---

## 2. `storedName`: bagaimana lokasi file dicatat

Kolom `FileObj.storedName` menyimpan **skema + key**, dipisah tanda `:`.

```
c406d62c-....PNG              ← data lama, tanpa prefix  → dianggap `local`
pegawai/0d6d5676-....pdf      ← upload baru, skema default tanpa prefix
minio:pbj/8a1b-....pdf        ← upload ke MinIO
```

Aturan penting:

- **Skema default (`local`) tidak diberi prefix** agar nama tetap ringkas dan
  kompatibel dengan data lama.
- **Nama tanpa prefix selalu dianggap `local`** — inilah yang membuat file lama
  tetap terbaca tanpa perlu di-upload ulang.
- `parseStoredName` mengenali skema lewat daftar `SKEMA_DIKENAL`, **bukan** lewat
  registry provider. Jadi `minio:...` tetap bisa diparse (dan memberi pesan
  error yang jelas) walau backend MinIO belum diimplementasikan.

---

## 3. Mengaktifkan MinIO

Kode provider sudah diimplementasikan (`src/lib/storage/minio.ts`, SDK `minio`
versi 8) dan terdaftar di registry `PROVIDERS`. Secara default aplikasi tetap
memakai `local` — beralih cukup lewat env, **tanpa ubah kode**.

### 3.1 Siapkan server MinIO

Jalankan server MinIO (atau pakai yang sudah ada), catat endpoint + akses key.
Bucket dibuat otomatis saat upload pertama (`pastikanBucket`).

### 3.2 Isi konfigurasi

```env
STORAGE_BACKEND="minio"
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="..."
MINIO_SECRET_KEY="..."
MINIO_BUCKET="arsip"
```

Variabel `MINIO_*` sudah tersedia di `.env` (kosong = belum dikonfigurasi).
Restart aplikasi setelah mengubah env.

| Env | Default | Keterangan |
|---|---|---|
| `STORAGE_BACKEND` | `local` | backend untuk **upload baru** |
| `STORAGE_DIR` | `<repo>/storage` | folder backend `local` |

> Membaca file **tidak** memakai `STORAGE_BACKEND`. Lokasi selalu ditentukan
> prefix `storedName`. Inilah yang memungkinkan file lama dan baru hidup
> berdampingan selama migrasi.

---

## 4. Prosedur migrasi ke MinIO

Migrasi bersifat **bertahap** — tidak ada big-bang, tidak ada downtime.

### Langkah 1 — Backfill prefix (opsional, nol byte dipindahkan)

Data lama tanpa prefix sudah otomatis dianggap `local`, jadi langkah ini
**opsional**. Tujuannya hanya membuat lokasi tercatat eksplisit di DB.

```bash
cd lamari/app
npx tsx scripts/backfill-storage-prefix.ts              # pratinjau (dry-run)
npx tsx scripts/backfill-storage-prefix.ts --apply      # eksekusi
```

Skrip ini **idempoten** — baris yang sudah berprefix dilewati, aman diulang.

### Langkah 2 — Nyalakan backend baru (cukup switch env)

Provider MinIO sudah terdaftar. Set `STORAGE_BACKEND="minio"`, isi `MINIO_*`,
lalu restart aplikasi. Upload **baru** masuk ke MinIO; file lama tetap dibaca
dari disk. Keduanya jalan bersamaan.

### Langkah 3 — Pindahkan file lama dengan skrip sinkron

```bash
npx tsx scripts/sinkron-ke-minio.ts                        # pratinjau (dry-run)
npx tsx scripts/sinkron-ke-minio.ts --apply                # eksekusi penuh
npx tsx scripts/sinkron-ke-minio.ts --apply --limit 100    # bertahap 100 file
npx tsx scripts/sinkron-ke-minio.ts --apply --hapus-lokal  # + hapus file lokal yg sukses
```

Cara kerja per file: baca dari disk → upload ke MinIO → **baca balik** dan
bandingkan ukuran + SHA-256 → baru alihkan `storedName` di DB ke prefix
`minio:`. File yang gagal **tidak** diubah prefix-nya, aman untuk diulang.

File lokal **tidak** dihapus otomatis — tambahkan `--hapus-lokal` untuk
membersihkan setelah semua terverifikasi. Ini opsional: membiarkan file lokal
tetap ada tidak merusak apa pun (DB sudah menunjuk ke MinIO).

### Rollback

| Skenario | Tindakan |
|---|---|
| Upload baru bermasalah | Hapus `STORAGE_BACKEND` → kembali ke `local` |
| File lama tak terbaca | Pastikan `STORAGE_DIR` benar & file masih ada |
| Salah backfill prefix | `UPDATE "FileObj" SET "storedName" = substring("storedName" from 7) WHERE ...` |

---

## 5. Catatan keamanan

`LocalStorageProvider.resolve()` menormalisasi key sebelum menyentuh disk:

- komponen `..` dan `.` dibuang,
- tiap segmen dilewatkan `path.basename()`,
- hasil akhir **wajib** berada di dalam `STORAGE_DIR` (pertahanan berlapis).

Diuji di `tests/storage-local.test.ts` (path traversal, absolute path, idempoten).

> Provider baru (MinIO/S3) **wajib** punya pengamanan setara. Jangan asumsikan
> key dari DB selalu bersih.

---

## 6. Pengujian

```bash
npx vitest run                        # unit test (prefix router + provider lokal)
npx tsx scripts/smoke-storage.ts      # round-trip: put → read → hapus
```
