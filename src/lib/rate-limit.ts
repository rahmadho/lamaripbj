import "server-only";

type Bucket = { count: number; resetAt: number };

// ponytail: rate limit in-memory per proses. Cukup utk single-instance self-host.
// Ganti ke Redis/DB bila nanti dijalankan multi-instance.
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
// Batas lintas-akun per IP (anti credential-stuffing) — lebih longgar dari
// batas per akun, tapi tetap membendung percobaan masif dari satu sumber.
const MAX_ATTEMPTS_IP = 30;

export function cekRateLimit(
  key: string,
  max = MAX_ATTEMPTS
): { ok: boolean; sisa: number; detikTunggu: number } {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, sisa: max - 1, detikTunggu: 0 };
  }
  if (b.count >= max) {
    return { ok: false, sisa: 0, detikTunggu: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, sisa: max - b.count, detikTunggu: 0 };
}

export { MAX_ATTEMPTS_IP };

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

// pembersihan berkala agar map tidak tumbuh tanpa batas
export function bersihkanBucket() {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

if (typeof setInterval !== "undefined") {
  const t = setInterval(bersihkanBucket, 5 * 60_000);
  if (typeof t.unref === "function") t.unref();
}
