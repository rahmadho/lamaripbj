/**
 * Logika deret nomor halaman — murni & bebas framework agar bisa diuji
 * terpisah dari komponen `Pagination` di klien.
 */

/**
 * Hitung nomor halaman yang ditampilkan: selalu halaman pertama & terakhir,
 * jendela di sekitar halaman aktif, dan `"…"` sebagai penanda lompatan.
 */
export function deretHalaman(halaman: number, total: number): (number | "…")[] {
  if (total <= 0) return [];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const hasil: (number | "…")[] = [1];
  const mulai = Math.max(2, halaman - 1);
  const akhir = Math.min(total - 1, halaman + 1);

  if (mulai > 2) hasil.push("…");
  for (let i = mulai; i <= akhir; i++) hasil.push(i);
  if (akhir < total - 1) hasil.push("…");
  hasil.push(total);

  return hasil;
}
