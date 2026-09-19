# syntax=docker/dockerfile:1.7
# ── Build dependencies ──────────────────────────────────────────────
# BuildKit syntax: cache mount untuk npm agar tidak unduh ulang tiap build.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  npm ci

# ── Dependensi runtime saja (production) ────────────────────────────────
# Prisma CLI dipakai saat runtime (`prisma migrate deploy` di entrypoint),
# dan CLI-nya butuh dependency transitif lengkap (effect, c12, dll.). Karena
# itu kita install production deps UTUH di sini lalu salin seluruhnya ke
# runner — jauh lebih tahan-maintenance daripada menyalin paket satu-satu.
FROM node:24-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  npm ci --omit=dev

# ── Build aplikasi ────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS builder
WORKDIR /app
# Slim image tidak punya openssl & CA certificates. Install di sini agar file
# /usr/lib/ssl, /etc/ssl/certs, libssl.so, libcrypto.so tersedia untuk di-COPY
# ke stage runner (distroless tidak punya apt).
# Cache mount apt: paket .deb & index tersimpan antar build.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Telemetri Next.js dimatikan agar build tidak mengirim data keluar.
ENV NEXT_TELEMETRY_DISABLED=1
# Cache: prisma engine (~/.cache/prisma), Next/turbopack build cache (.next/cache),
# dan cache tsc (node_modules/.cache). Ketiganya mempercepat incremental re-build.
RUN --mount=type=cache,target=/root/.cache/prisma,sharing=locked \
    --mount=type=cache,target=/app/.next/cache,sharing=locked \
    --mount=type=cache,target=/app/node_modules/.cache,sharing=locked \
    npx prisma generate \
 && npm run build \
 && npx tsc prisma/seed.ts --outDir prisma --module commonjs --target es2022 --esModuleInterop --skipLibCheck --resolveJsonModule \
 && mkdir -p /app/storage-seed

# ── Runtime: Distroless hardened ─────────────────────────────────────
# gcr.io/distroless/nodejs24-debian12: non-root, tanpa shell/package manager,
# tanpa libc ekstra — permukaan serangan minimum. Prisma butuh openssl &
# ca-certificates: disalin dari stage builder (distroless tidak punya apt).
FROM gcr.io/distroless/nodejs24-debian12:nonroot AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    STORAGE_DIR=/data/storage \
    HOME=/tmp

# OpenSSL & CA certificates untuk Prisma engine + fetch HTTPS (API Sipedal).
# Symlink di /etc/ssl/certs menunjuk ke /usr/share/ca-certificates → ikut disalin.
COPY --from=builder /usr/lib/ssl /usr/lib/ssl
COPY --from=builder /etc/ssl/certs /etc/ssl/certs
COPY --from=builder /usr/share/ca-certificates /usr/share/ca-certificates
COPY --from=builder /lib/x86_64-linux-gnu/libssl.so* /lib/x86_64-linux-gnu/
COPY --from=builder /lib/x86_64-linux-gnu/libcrypto.so* /lib/x86_64-linux-gnu/

# Semua penyalinan ke runner pakai --chown=65532:65532 agar proses nonroot
# (uid 65532) bisa membaca & MENULIS — Prisma CLI perlu menulis/mengganti
# binary di node_modules/@prisma/engines saat `migrate deploy`.
COPY --from=builder --chown=65532:65532 /app/public ./public
COPY --from=builder --chown=65532:65532 /app/.next/standalone ./
COPY --from=builder --chown=65532:65532 /app/.next/static ./.next/static
COPY --from=builder --chown=65532:65532 /app/prisma ./prisma
COPY --from=builder --chown=65532:65532 /app/scripts ./scripts
# node_modules production lengkap (termasuk Prisma CLI + dependency transitif).
COPY --from=prod-deps --chown=65532:65532 /app/node_modules ./node_modules
# Client Prisma yang sudah di-generate menimpa placeholder di atas.
COPY --from=builder --chown=65532:65532 /app/node_modules/.prisma ./node_modules/.prisma

# Distroless: non-root (uid 65532), tanpa shell → entrypoint via node langsung.
# Migrasi/seed dijalankan dari entrypoint JS (lihat docker/entrypoint.mjs).
COPY --chown=65532:65532 docker/entrypoint.mjs ./docker/entrypoint.mjs
# Distroless tidak punya shell, jadi `RUN mkdir` akan gagal. Buat direktori
# storage di builder lalu salin dengan ownership uid/gid nonroot (65532).
COPY --from=builder --chown=65532:65532 /app/storage-seed/ /data/storage/

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/login').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["/nodejs/bin/node", "docker/entrypoint.mjs"]
# CMD = argumen Node untuk menjalankan server, BUKAN perintah `node` itu sendiri.
# Entrypoint sudah memakai NODE (/nodejs/bin/node) di depannya, jadi cukup nama file.
CMD ["server.js"]
