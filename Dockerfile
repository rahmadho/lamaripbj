# ── Build dependencies ──────────────────────────────────────────────
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Build aplikasi ────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Telemetri Next.js dimatikan agar build tidak mengirim data keluar.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate \
 && npm run build \
 && npx tsc prisma/seed.ts --outDir prisma --module commonjs --target es2022 --esModuleInterop --skipLibCheck --resolveJsonModule

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
    STORAGE_DIR=/data/storage

# OpenSSL & CA certificates untuk Prisma engine + fetch HTTPS (API Sipedal).
COPY --from=builder /usr/lib/ssl /usr/lib/ssl
COPY --from=builder /etc/ssl/certs /etc/ssl/certs
COPY --from=builder /lib/x86_64-linux-gnu/libssl.so* /lib/x86_64-linux-gnu/
COPY --from=builder /lib/x86_64-linux-gnu/libcrypto.so* /lib/x86_64-linux-gnu/

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

# Distroless: non-root (uid 65532), tanpa shell → entrypoint via node langsung.
# Migrasi/seed dijalankan dari entrypoint JS (lihat docker/entrypoint.mjs).
COPY docker/entrypoint.mjs ./docker/entrypoint.mjs
RUN mkdir -p /data/storage

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/login').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["/nodejs/bin/node", "docker/entrypoint.mjs"]
CMD ["node", "server.js"]
