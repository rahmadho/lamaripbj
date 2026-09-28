import "server-only";

/**
 * Verifikasi **magic bytes** berkas — jangan percaya `File.type` yang dikirim
 * klien (bisa di-spoof). Dipakai `saveFile` sebelum menulis ke storage.
 *
 * Hanya signature untuk MIME yang diizinkan (lihat `./aturan.ts`) yang dikenali.
 * Bila ekstensi & content-type menyatakan format tertentu tetapi byte awal tidak
 * cocok (atau sebaliknya), berkas ditolak.
 */

type Signature = {
  mime: string;
  /** Offset byte awal (sebagian format butuh melewati header). */
  offset?: number;
  bytes: number[];
  /** Pola tambahan yang harus cocok (mis. untuk membedakan OOXML). */
  extra?: { offset: number; bytes: number[] };
};

// OOXML (docx/xlsx) adalah arsip ZIP → signature PK\x03\x04. Pembedaan sesungguhnya
// butuh membaca isi zip; untuk keamanan cukup memastikan itu arsip ZIP yang valid.
const ZIP_SIG: number[] = [0x50, 0x4b, 0x03, 0x04];

const SIGNATURES: Signature[] = [
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  {
    mime: "image/webp",
    // "RIFF" .... "WEBP"
    bytes: [0x52, 0x49, 0x46, 0x46],
    extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  },
  {
    // legacy Office (doc/xls): OLE compound file
    mime: "application/msword",
    bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  },
  {
    mime: "application/vnd.ms-excel",
    bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: ZIP_SIG,
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bytes: ZIP_SIG,
  },
];

/** Cocokkan byte awal `buf` terhadap signature pada offset tertentu. */
function cocok(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

/**
 * Deteksi MIME dari magic bytes. Mengembalikan `null` bila tidak ada
 * signature yang dikenali.
 */
export function deteksiMime(buf: Buffer): string | null {
  for (const sig of SIGNATURES) {
    if (cocok(buf, sig.bytes, sig.offset ?? 0)) {
      if (sig.extra && !cocok(buf, sig.extra.bytes, sig.extra.offset)) continue;
      return sig.mime;
    }
  }
  return null;
}

/**
 * Pastikan isi berkas benar-benar sesuai MIME yang diklaim.
 *
 * @param buf          byte awal berkas (minimal ~16 byte; lebih panjang lebih baik)
 * @param mimeKlaim    `File.type` dari klien
 * @throws Error dengan pesan siap tampil bila tidak cocok
 */
export function assertIsiSesuaiMime(buf: Buffer, mimeKlaim: string): void {
  const terdeteksi = deteksiMime(buf);
  if (!terdeteksi) {
    throw new Error("Isi berkas tidak dikenali atau tidak diizinkan");
  }

  // OOXML (docx/xlsx) & legacy (doc/xls) berbagi signature; terima selama
  // masih dalam keluarga yang sama.
  const keluarga = (m: string): string => {
    if (m === "application/pdf") return "pdf";
    if (m.startsWith("image/")) return m;
    if (m === "application/msword" || m.endsWith("wordprocessingml.document"))
      return "word";
    if (m === "application/vnd.ms-excel" || m.endsWith("spreadsheetml.sheet"))
      return "excel";
    return m;
  };

  if (keluarga(terdeteksi) !== keluarga(mimeKlaim)) {
    throw new Error("Isi berkas tidak cocok dengan tipe yang dinyatakan");
  }
}

/** Jumlah byte awal yang dibaca untuk deteksi (cukup untuk semua signature). */
export const MAGIC_HEAD_BYTES = 16;
