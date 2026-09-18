import { Client } from "minio";
import type { Readable } from "stream";
import type { StorageProvider } from "./types";

/**
 * Backend MinIO / S3-compatible.
 *
 * Konfigurasi lewat env (lihat `.env`):
 *   MINIO_ENDPOINT, MINIO_PORT, MINIO_USE_SSL,
 *   MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET.
 *
 * Client dibuat malas (lazy) agar aplikasi tetap jalan normal saat MinIO
 * belum dikonfigurasi — error baru dilempar ketika backend ini dipakai.
 */
export class MinioStorageProvider implements StorageProvider {
  readonly nama = "minio";

  private client: Client | null = null;
  private bucketSiap = false;

  private get bucket(): string {
    return process.env.MINIO_BUCKET?.trim() || "arsip";
  }

  private getClient(): Client {
    if (this.client) return this.client;
    const endpoint = process.env.MINIO_ENDPOINT?.trim();
    const accessKey = process.env.MINIO_ACCESS_KEY?.trim();
    const secretKey = process.env.MINIO_SECRET_KEY;
    if (!endpoint || !accessKey || !secretKey) {
      throw new Error(
        "Konfigurasi MinIO belum lengkap (MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY). " +
          "Lihat docs/STORAGE.md bagian 3."
      );
    }
    this.client = new Client({
      endPoint: endpoint,
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey,
      secretKey,
    });
    return this.client;
  }

  private async pastikanBucket(): Promise<void> {
    if (this.bucketSiap) return;
    const c = this.getClient();
    const ada = await c.bucketExists(this.bucket);
    if (!ada) await c.makeBucket(this.bucket);
    this.bucketSiap = true;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const c = this.getClient();
    await this.pastikanBucket();
    await c.putObject(this.bucket, key, data, data.length);
  }

  async getStream(key: string): Promise<Readable> {
    const c = this.getClient();
    return (await c.getObject(this.bucket, key)) as Readable;
  }

  async remove(key: string): Promise<void> {
    const c = this.getClient();
    try {
      await c.removeObject(this.bucket, key);
    } catch (e) {
      // Objek sudah tidak ada = sukses (idempoten).
      if ((e as { code?: string })?.code !== "NoSuchKey") throw e;
    }
  }
}
