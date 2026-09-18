# Deploy Docker — Aplikasi Arsip Kantor

Panduan menjalankan aplikasi sebagai container. **Database (PostgreSQL) dan
MinIO sudah berjalan sebagai container lain** di network eksternal — compose
ini hanya membangun & menjalankan aplikasi dengan **pembatasan resource
(CPU & RAM)** dan image runtime **Distroless hardened**.

---

## 1. Prasyarat

- Docker Engine 24+ dan plugin Compose v2 (`docker compose version`).
- PostgreSQL sudah berjalan sebagai container di network **`db-network`**.
- (Bila pakai MinIO) MinIO sudah berjalan sebagai container di network **`app-network`**.
- Salin contoh env lalu isi rahasianya:

```bash
cd lamari/app
cp .env.docker.example .env
```

Wajib diisi sebelum `up`:

| Variabel | Cara isi |
|---|---|
| `DATABASE_URL` | host = **nama container/service Postgres** di db-network (bukan `localhost`), mis. `postgres://arsip:PASS@nama-service-postgres:5432/arsip` |
| `AUTH_SECRET` | hasil `npx auth secret` (acak, min. 32 karakter) |
| `MINIO_ENDPOINT` (bila MinIO) | nama container MinIO di app-network |

> `.env` sudah masuk `.dockerignore` — tidak ikut ke dalam image.

## 2. Jalankan

```bash
docker compose up -d --build
```

Entrypoint container (tanpa shell — distroless) otomatis:

1. menunggu Postgres siap (maks. ~60 detik),
2. menjalankan `prisma migrate deploy`,
3. menjalankan seed **hanya** bila `DB_SEED=true`,
4. menjalankan `node server.js`.

Cek status:

```bash
docker compose ps
docker compose logs -f app
```

Aplikasi: `http://localhost:3000` (atau port `APP_PORT`).

Seed awal (satu kali, saat DB masih kosong):

```bash
DB_SEED=true docker compose up -d
# setelah selesai, kembalikan ke false agar restart berikutnya tidak seed ulang
```

## 3. Network

```yaml
networks:
  db-network:  { external: true }
  app-network: { external: true }
```

Pastikan kedua network itu benar-benar ada:

```bash
docker network ls | grep -E "db-network|app-network"
```

Bila nama network berbeda, sesuaikan bagian `networks:` di
`docker-compose.yml` (nama eksternal harus persis).

## 4. Image runtime Distroless (hardened)

Runtime memakai `gcr.io/distroless/nodejs24-debian12:nonroot`:

- **non-root** (uid 65532) — proses tidak berjalan sebagai root.
- **Tanpa shell, tanpa package manager** — jika attacker dapat eksekusi,
  tidak ada `/bin/sh` untuk dipakai.
- Permukaan serangan minimum; OpenSSL & CA certs disalin dari build stage
  (dibutuhkan Prisma engine + HTTPS ke API Sipedal).
- Stage build memakai `node:24-bookworm-slim`.

Konsekuensi praktis: **tidak bisa `docker exec -it app sh`** untuk debugging.
Untuk inspeksi, jalankan container debug terpisah yang menyalin filesystem
container app, atau lihat log (`docker compose logs -f app`).

## 5. Pembatasan resource

Batas CPU & RAM diatur di `.env` dan diterapkan lewat `deploy.resources`:

| Variabel | Default |
|---|---|
| `APP_CPU_LIMIT` | `0.50` |
| `APP_MEM_LIMIT` | `512M` |
| `APP_CPU_RESERVE` | `0.25` |
| `APP_MEM_RESERVE` | `256M` |

> `deploy.resources.limits` **dihormati oleh Docker Swarm**; pada Compose
> biasa perlu didukung backend-nya. Untuk jaminan keras di semua setup,
> batasi via cgroups (systemd) atau flag `--memory`/`--cpus` saat run manual.

### Verifikasi batas aktif

```bash
docker stats --no-stream
```

## 6. Operasional

```bash
docker compose down            # hentikan (data di volume tetap ada)
docker compose pull && docker compose up -d --build   # update
```

Backup: database ada di container Postgres eksternal (pakai `pg_dump` dari
sana — lihat `docs/BACKUP.md`); volume yang perlu dicadangkan di compose ini
hanya `storage` (file lokal bila `STORAGE_BACKEND=local`).

```bash
docker volume ls | grep lamaripbj
docker run --rm -v lamaripbj_storage:/src -v $(pwd)/backups:/dst \
  alpine tar -czf /dst/storage-$(date +%F).tar.gz -C /src .
```

## 7. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| `GAGAL: database tidak terjangkau` | nama host di `DATABASE_URL` salah / network salah join | cek `docker network inspect db-network`, samakan nama service |
| `P1001: Can't reach database` | `DATABASE_URL` memakai `localhost` | host harus nama container Postgres di db-network |
| Login gagal setelah deploy | `AUTH_SECRET` kosong/berubah | isi dengan `npx auth secret`, jangan ganti tiap deploy |
| File upload hilang setelah recreate | volume `storage` tidak terpasang | pastikan `volumes: - storage:/data/storage`; jangan hapus volume |
| MinIO `AccessDenied` | kredensial salah / bucket belum dibuat | cek `MINIO_ACCESS_KEY/SECRET` sama dengan container MinIO eksternal |
| Tidak bisa `docker exec sh` | memang demikian — distroless tanpa shell | gunakan `docker compose logs`, atau jalankan container debug terpisah |
| OOMKilled (`Exited (137)`) | `APP_MEM_LIMIT` terlalu kecil | naikkan limit, cek `docker stats` |
