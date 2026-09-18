import path from "path";

/**
 * Sanitasi segmen nama file: buang karakter ilegal untuk filesystem,
 * rapikan spasi/tanda hubung, dan batasi panjang agar nama total tetap wajar.
 */
function sanitize(part: string | null | undefined): string {
  if (!part) return "";
  return part
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // buang diakritik
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, " ") // karakter ilegal/berisiko di header
    .replace(/\s+/g, " ")
    .trim();
}

/** Gabungkan segmen (abaikan yang kosong) dengan pemisah `_`. */
function gabung(parts: (string | null | undefined)[]): string {
  return parts
    .map(sanitize)
    .filter((p) => p.length > 0)
    .join("_");
}

/** Format tanggal `YYYYMMDD` (default: sekarang). */
function tanggalRingkas(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Ekstensi asli (dengan titik) dari nama file, mis. ".pdf". */
export function ekstensiAsli(fileName: string): string {
  return path.extname(fileName);
}

/** Batasi total panjang nama file pada filesystem umum. */
function batasi(nama: string, max = 180): string {
  if (nama.length <= max) return nama;
  return nama.slice(0, max).trimEnd();
}

/**
 * Format nama unduh Arsip Pegawai:
 * `[NAMA_USER_UPLOADER]_[PARENT_DIRECTORY_NAME]_[DIRECTORY_NAME]_[DATE]_[DOCUMENT_NUMBER]_[DOCUMENT_NAME]`
 */
export function namaFilePegawai(input: {
  uploader: string | null | undefined;
  parentDir: string | null | undefined;
  dir: string | null | undefined;
  tanggal: Date;
  nomor: string | null | undefined;
  namaDokumen: string | null | undefined;
  ext: string;
}): string {
  const dasar = gabung([
    input.uploader,
    input.parentDir,
    input.dir,
    tanggalRingkas(input.tanggal),
    input.nomor,
    input.namaDokumen,
  ]);
  const nama = dasar.length > 0 ? dasar : "dokumen";
  return batasi(nama) + input.ext;
}

/**
 * Format nama unduh Arsip PBJ:
 * `[KODE_PAKET]_[NAMA_SINGKAT]_[JENIS_PENGADAAN]_[METODE_PENGADAAN]`
 * (jenis & metode sudah berupa label panjang, mis. "Pekerjaan Konstruksi").
 */
export function namaFilePbj(input: {
  kodePaket: string | null | undefined;
  namaSingkat: string | null | undefined;
  jenis: string | null | undefined; // label panjang
  metode: string | null | undefined; // label panjang
  ext: string;
}): string {
  const dasar = gabung([input.kodePaket, input.namaSingkat, input.jenis, input.metode]);
  const nama = dasar.length > 0 ? dasar : "dokumen";
  return batasi(nama) + input.ext;
}
