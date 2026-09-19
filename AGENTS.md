<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Aturan Development — TypeScript / Next.js

Berlaku untuk semua sesi di project ini. Ditulis manual (jangan dihapus atau
dipindah ke dalam blok `nextjs-agent-rules` di atas — blok itu di-generate ulang
oleh `next dev`).

## 1. Alur verifikasi (hemat waktu)

Jangan jalankan `next build` setiap kali perubahan — build lambat (turbopack +
filesystem lambat + Prisma). Pakai tingkat verifikasi sesuai jenis perubahan:

| Situasi | Yang dijalankan |
|---|---|
| Perubahan UI/logika bertahap (teks, JSX, style, komponen, server action, bug fix) | `npx tsc --noEmit` + `npx eslint <file yang berubah>` |
| User minta eksplisit "build/cek dulu" | `npm run build` (penuh) |
| Perubahan menyentuh `next.config.ts` | `npx tsc --noEmit` **+** `npm run build` |
| Perubahan menyentuh `prisma/schema.prisma` | `npx prisma validate` + `npx prisma generate` + `npx tsc --noEmit` |
| Perubahan menyentuh `package.json` (dependensi) | `npm install` lalu `npx tsc --noEmit`; build bila menjelang deploy |
| Perubahan `Dockerfile` / `docker-compose.yml` / `docker/entrypoint.mjs` | lihat bagian Docker di bawah |
| Menjelang deploy | `npx tsc --noEmit` + `npx eslint` + `npm run build` |

**Default bila ragu:** `npx tsc --noEmit` (cepat, menangkap sebagian besar error
tipe/import/prop). Naikkan ke `npm run build` hanya bila ada alasan konkret.

## 2. Konvensi kode TypeScript

- **Strict mode aktif** (`tsconfig.json` → `"strict": true`). Jangan menambah
  `any` implisit; hindari `as` yang menyembunyikan tipe. Bila `any`/`unknown`
  terpaksa dipakai, sempitkan dengan type guard.
- Alias path **`@/*` → `./src/*`** (lihat `tsconfig.json`). Gunakan `@/...`,
  jangan path relatif naik-turun (`../../`) untuk lintas folder.
- **Server action**: file di `src/server/actions/*` wajib `"use server"` di
  atas, kembalikan bentuk hasil terstruktur (`{ ok: boolean; error?: string }`),
  dan catat audit (`logAudit`). Pesan error/UX dalam **Bahasa Indonesia**.
- **Boundary Server/Client Component**: tandai `"use client"` hanya bila perlu
  (state/effect/event handler). Jangan mengimpor kode server-only ke komponen
  client.
- Nama file komponen: kebab-case (`upload-arsip-form.tsx`); export nama PascalCase.
- Pembulatan/format angka & tanggal: ikuti helper yang sudah ada, jangan bikin
  format baru sendiri.

## 3. Konvensi UI (shadcn + Base UI)

- Komponen UI ada di `src/components/ui/*`. Gunakan **`render={<X />}`**, **bukan
  `asChild`** (Base UI, bukan Radix).
- `Button` dengan `render` elemen **non-`<button>`** (mis. `<a>` / `<Link>`) wajib
  `nativeButton={false}` (sudah di-default otomatis di wrapper `ui/button.tsx`,
  tapi eksplisit lebih jelas).
- Jangan menambah dependensi UI baru tanpa diminta; pakai primitif yang ada.

## 4. Aturan Docker / deploy (WAJIB — jangan asal tulis)

Sebelum menulis/mengubah apa pun yang berhubungan dengan deploy (Dockerfile,
compose, entrypoint, Nginx, CI/CD, env, migrasi), **baca dulu seluruh rantai
konteks yang saling bergantung**, bukan menulis dari asumsi:

1. `Dockerfile`, `docker-compose.yml`, `docker/entrypoint.mjs`,
   `prisma/schema.prisma`, `next.config.ts`, `package.json`, `.dockerignore`.
2. **Telusuri rantai eksekusi secara utuh**, bukan per-baris. Contoh nyata yang
   pernah jadi bug di project ini:
   - `ENTRYPOINT` + `CMD` → bagaimana `process.argv` sampai ke `spawnSync`
     (bug `Cannot find module '/app/node'`). `CMD` harus berisi **argumen Node**
     (`["server.js"]`), bukan perintah `node` itu sendiri.
   - `COPY` tanpa `--chown=65532:65532` → proses nonroot (distroless) gagal
     tulis (bug `Can't write to /app/node_modules/@prisma/engines`).
   - `node:24-bookworm-slim` tidak punya `openssl`/`ca-certificates` → install
     dulu di stage build sebelum di-`COPY` ke runner.
   - `prisma` sebagai devDependency → dependency transitif (`effect`, `c12`)
     tak ikut ke image; simpan sebagai **dependency** dan install `--omit=dev`
     utuh lewat stage `prod-deps`.
   - Runtime **distroless tanpa shell** → `RUN mkdir` akan GAGAL. Buat direktori
     di stage build lalu `COPY --chown`, jangan `RUN`.
3. **Verifikasi yang bisa diverifikasi** sebelum selesai: `node --check` untuk
   `.mjs`, `npx prisma validate`, konsistensi `package-lock.json` vs
   `package.json`, keberadaan file/path yang dirujuk.
4. **Antisipasi kegagalan umum** dan tangani di tempat yang tepat: retry koneksi
   DB (latensi eksternal), permission (`--chown`), `HOME` writable, pesan error
   yang actionable.
5. **Jujur soal tingkat keyakinan**: sebutkan bagian yang belum bisa dipastikan
   dan cara memverifikasinya. Build hanya bisa diuji di server — Docker **tidak
   tersedia** di sandbox pengembangan, jadi konfirmasi statis + langkah verifikasi
   di server yang disertakan.

Tujuan: pengaturan deploy harus **benar-benar siap deploy**, bukan tebakan.

## 5. Perubahan database

- Perubahan schema lewat `prisma migrate dev` (lokal) → commit folder
  `prisma/migrations/*`. Jangan mengedit migrasi yang sudah ter-apply.
- Setelah ubah schema: `npx prisma generate` agar tipe client sinkron, lalu
  `npx tsc --noEmit`.
- Password/DSN jangan pernah ditulis di kode — pakai env (`DATABASE_URL`). Perhatikan
  encoding karakter khusus di URL (mis. `@` → `%40`).

## 6. Bahasa & komunikasi

- Balasan ke user dalam **Bahasa Indonesia**; istilah teknis boleh Inggris.
- Saat membuat commit, pesan ringkas Bahasa Indonesia, fokus pada "kenapa"
