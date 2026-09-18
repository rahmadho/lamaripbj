// Entrypoint container tanpa shell (distroless): cek DB siap → migrasi → seed
// (opsional) → jalankan server. `spawnSync` dengan `shell:false` (aman dari
// command injection); proses menunggu anaknya selesai agar PID 1 menerima
// sinyal Docker (SIGTERM) dengan benar.
import net from "node:net";
import { spawnSync } from "node:child_process";
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

console.log("[entrypoint] menerapkan migrasi prisma...");
{
  const r = spawnSync(NODE, [PRISMA, "migrate", "deploy"], { stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
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
