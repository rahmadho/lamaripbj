import type { Readable } from "stream";

/**
 * Kontrak backend penyimpanan file arsip.
 *
 * `key` adalah nama objek yang sudah "dinormalisasi": tanpa prefix skema dan
 * tanpa komponen path. Provider tidak bertanggung jawab memvalidasi key —
 * itu tugas lapisan router di `./index.ts`.
 */
export interface StorageProvider {
  /** Identitas backend, dipakai sebagai prefix pada `storedName` di DB. */
  readonly nama: string;
  /** Simpan objek baru. Menimpa bila key sudah ada. */
  put(key: string, data: Buffer): Promise<void>;
  /** Buka stream baca. Melempar bila objek tidak ada. */
  getStream(key: string): Promise<Readable>;
  /** Hapus objek. Tidak melempar bila objek sudah tidak ada. */
  remove(key: string): Promise<void>;
}

export type Skema = "local" | "minio";

export const SKEMA_DEFAULT: Skema = "local";
