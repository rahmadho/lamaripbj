import "server-only";

type Bucket = { count: number; resetAt: number };

// ponytail: rate limit in-memory per proses. Cukup utk single-instance self-host.
// Ganti ke Redis/DB bila nanti dijalankan multi-instance.
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

export function cekRateLimit(key: string): { ok: boolean; sisa: number; detikTunggu: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, sisa: MAX_ATTEMPTS - 1, detikTunggu: 0 };
  }
  if (b.count >= MAX_ATTEMPTS) {
    return { ok: false, sisa: 0, detikTunggu: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, sisa: MAX_ATTEMPTS - b.count, detikTunggu: 0 };
}

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
