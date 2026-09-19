// Entrypoint container tanpa shell (distroless): cek DB siap → migrasi → seed
// (opsional) → jalankan server. `spawnSync` dengan `shell:false` (aman dari
// command injection); proses menunggu anaknya selesai agar PID 1 menerima
// sinyal Docker (SIGTERM) dengan benar.
import net from "node:net";
import { spawnSync } from "node:child_process";
import { mkdirSync, accessSync, chmodSync, readdirSync, statSync, constants } from "node:fs";
import process from "node:process";

const NODE = "/nodejs/bin/node";
const PRISMA = "node_modules/prisma/build/index.js";

function tungguDb(url, coba = 30, jedaMs = 2000) {
  const u = new URL(url);
  const host = u.hostname;
  const port = Number(u.port || 5432);
  return new Promise((resolve) => {
    let n = 0;
    const cobaSekali = () => {
      n += 1;
      const s = net.connect(port, host, () => {
        s.end();
        console.log(`[entrypoint] database terjangkau di ${host}:${port}.`);
        resolve(true);
      });
      s.on("error", () => {
        if (n >= coba) {
          console.error(`[entrypoint] GAGAL: database tidak terjangkau setelah ${coba}x coba.`);
          resolve(false);
        } else {
          setTimeout(cobaSekali, jedaMs);
        }
      });
      // jaga-jaga bila koneksi menggantung tanpa error
      setTimeout(() => {
        s.destroy();
      }, 3000);
    };
    cobaSekali();
  });
}

const siap = await tungguDb(process.env.DATABASE_URL ?? "");
if (!siap) process.exit(1);

// Pastikan direktori storage ada & bisa ditulis. Named volume Docker bisa
// ter-mount dengan ownership root meski ada --chown di image, jadi kita cek
// di sini (running sebagai uid nonroot 65532).
{
  const dir = process.env.STORAGE_DIR ?? "/data/storage";
  try {
    mkdirSync(dir, { recursive: true });
    accessSync(dir, constants.W_OK);
    console.log(`[entrypoint] storage siap & writable: ${dir}`);
  } catch (e) {
    console.error(
      `[entrypoint] GAGAL: direktori storage tidak writable: ${dir}\n` +
        `  ${e instanceof Error ? e.message : String(e)}\n` +
        `  Perbaiki di host: pastikan volume dimiliki uid 65532 ` +
        `(mis. \`docker volume rm <nama>\` agar dibuat ulang dari image).`
    );
    process.exit(1);
  }
}

// Prisma CLI menulis/mengganti binary di node_modules/@prisma/engines dan
// membaca client di node_modules/.prisma. Pastikan keduanya ada & writable
// oleh uid nonroot (65532) agar `migrate deploy` tidak gagal permission.
function pastikanWritable(p, label) {
  try {
    accessSync(p, constants.R_OK);
  } catch {
    console.error(
      `[entrypoint] GAGAL: ${p} tidak dapat diakses.\n` +
        `  Pastikan image dibangun ulang tanpa cache: docker compose build --no-cache app`
    );
    process.exit(1);
  }
  try {
    accessSync(p, constants.W_OK);
    console.log(`[entrypoint] ${label} OK (readable+writable): ${p}`);
    return;
  } catch {
    // Owner sudah 65532 lewat `COPY --chown`, jadi chmod best-effort seharusnya
    // berhasil. Tambahkan bit tulis untuk owner agar Prisma bisa ganti engine.
    try {
      chmodSync(p, 0o755);
      for (const f of readdirSync(p)) {
        const fp = `${p}/${f}`;
        try {
          if (statSync(fp).isFile()) chmodSync(fp, 0o755);
        } catch {
          /* abaikan file individual */
        }
      }
      accessSync(p, constants.W_OK);
      console.log(`[entrypoint] ${label} writable setelah chmod: ${p}`);
    } catch (e) {
      console.error(
        `[entrypoint] GAGAL: ${label} tidak writable: ${p}\n` +
          `  ${e instanceof Error ? e.message : String(e)}\n` +
          `  Rebuild image: docker compose build --no-cache app`
      );
      process.exit(1);
    }
  }
}

pastikanWritable("/app/node_modules/@prisma/engines", "prisma engines");
pastikanWritable("/app/node_modules/.prisma", "prisma client");

console.log("[entrypoint] menerapkan migrasi prisma...");
{
  // DB eksternal bisa lambat/berfluktuasi: coba beberapa kali sebelum menyerah
  // agar container tidak langsung restart-loop hanya karena timeout sesaat.
  const maksCoba = Number(process.env.MIGRATE_RETRY ?? 5);
  let sukses = false;
  for (let i = 1; i <= maksCoba; i++) {
    const r = spawnSync(NODE, [PRISMA, "migrate", "deploy"], { stdio: "inherit", shell: false });
    if (r.status === 0) {
      sukses = true;
      break;
    }
    console.error(`[entrypoint] migrasi gagal (percobaan ${i}/${maksCoba}).`);
    if (i < maksCoba) {
      // hindari "bentrok" lock migrasi saat percobaan berikutnya
      const jeda = 5_000;
      console.error(`[entrypoint] coba lagi dalam ${jeda / 1000} detik...`);
      await new Promise((res) => setTimeout(res, jeda));
    }
  }
  if (!sukses) {
    console.error(`[entrypoint] GAGAL: migrasi prisma tidak berhasil setelah ${maksCoba}x coba.`);
    process.exit(1);
  }
}

if ((process.env.DB_SEED ?? "false") === "true") {
  console.log("[entrypoint] DB_SEED=true — menjalankan seed...");
  // seed sudah dikompilasi ke JS saat build (lihat Dockerfile) karena tsx
  // tidak tersedia di runtime distroless.
  const r = spawnSync(NODE, ["prisma/seed.js"], { stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("[entrypoint] start aplikasi.");
const child = spawnSync(NODE, process.argv.slice(2), { stdio: "inherit", shell: false });
process.exit(child.status ?? 0);
