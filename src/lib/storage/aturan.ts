/**
 * Aturan validasi berkas — **client-safe** (tanpa Node API).
 *
 * Dipisah dari `./index.ts` karena barrel itu mengimpor `crypto`, `path`,
 * `prisma`, dan provider MinIO sehingga tidak boleh masuk bundle klien.
 * Form unggah memakai konstanta ini untuk validasi instan di sisi klien,
 * sementara server tetap memvalidasi ulang lewat `validateFile`.
 */

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export function isMimeAllowed(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

/** Validasi tipe & ukuran file. Melempar Error dengan pesan siap tampil. */
export function validateFile(file: File): void {
  if (!isMimeAllowed(file.type)) {
    throw new Error(`Tipe file tidak diizinkan: ${file.type || "tidak dikenal"}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Ukuran file melebihi 25 MB");
  }
}
