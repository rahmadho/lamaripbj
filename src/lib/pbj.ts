/**
 * Taksonomi pengadaan PBJ — sumber tunggal untuk label jenis & metode.
 * Dipakai di filter, form upload, form taksonomi, dan tampilan detail agar
 * daftar pilihan konsisten (sebelumnya terduplikasi di beberapa komponen).
 */

export const JENIS_PENGADAAN = [
  { value: "BARANG", label: "Pengadaan Barang" },
  { value: "KONSTRUKSI", label: "Pekerjaan Konstruksi" },
  { value: "JASA_KONSULTANSI", label: "Jasa Konsultansi" },
  { value: "JASA_LAINNYA", label: "Jasa Lainnya" },
] as const;

export const METODE_PENGADAAN = [
  { value: "TENDER", label: "Tender" },
  { value: "TENDER_CEPAT", label: "Tender Cepat" },
  { value: "SELEKSI", label: "Seleksi" },
  { value: "PENGADAAN_LANGSUNG", label: "Pengadaan Langsung" },
  { value: "PENUNJUKAN_LANGSUNG", label: "Penunjukan Langsung" },
  { value: "E_PURCHASING", label: "e-Purchasing" },
  { value: "DIKECUALIKAN", label: "Dikecualikan" },
] as const;

export type JenisPengadaanValue = (typeof JENIS_PENGADAAN)[number]["value"];
export type MetodePengadaanValue = (typeof METODE_PENGADAAN)[number]["value"];

const JENIS_MAP: Record<string, string> = Object.fromEntries(
  JENIS_PENGADAAN.map((j) => [j.value, j.label])
);
const METODE_MAP: Record<string, string> = Object.fromEntries(
  METODE_PENGADAAN.map((m) => [m.value, m.label])
);

/** Label panjang jenis pengadaan, mis. `BARANG` → "Pengadaan Barang". */
export function labelJenis(value: string): string {
  return JENIS_MAP[value] ?? value;
}

/** Label panjang metode pengadaan, mis. `E_PURCHASING` → "e-Purchasing". */
export function labelMetode(value: string): string {
  return METODE_MAP[value] ?? value;
}
