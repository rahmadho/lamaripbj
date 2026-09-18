import { mkdir, writeFile, unlink } from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import type { Readable } from "stream";
import type { StorageProvider } from "./types";

const STORAGE_DIR = process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage");

/**
 * Backend filesystem lokal.
 *
 * Keamanan: key dinormalisasi sebelum menyentuh disk — komponen `..` dan
 * absolute path dibuang, sehingga path traversal tidak mungkin walau key
 * datang dari DB yang sudah termodifikasi. Sub-folder (mis. `pegawai/`) tetap
 * dipertahankan agar perilakunya konsisten dengan backend object storage.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly nama = "local";

  private resolve(key: string): string {
    const aman = key
      .split("/")
      .filter((bagian) => bagian && bagian !== "." && bagian !== "..")
      .map((bagian) => path.basename(bagian));
    const full = path.join(/* turbopackIgnore: true */ STORAGE_DIR, ...aman);

    // pertahanan berlapis: hasil akhir wajib berada di dalam STORAGE_DIR
    const akar = path.resolve(/* turbopackIgnore: true */ STORAGE_DIR);
    const target = path.resolve(/* turbopackIgnore: true */ full);
    if (target !== akar && !target.startsWith(akar + path.sep)) {
      throw new Error("Key storage tidak valid");
    }
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const tujuan = this.resolve(key);
    await mkdir(path.dirname(/* turbopackIgnore: true */ tujuan), { recursive: true });
    await writeFile(tujuan, data);
  }

  async getStream(key: string): Promise<Readable> {
    return createReadStream(this.resolve(key));
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch (e) {
      // ENOENT dianggap sukses (idempoten); sisanya diteruskan.
      if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") throw e;
    }
  }
}

export const storageDir = STORAGE_DIR;
