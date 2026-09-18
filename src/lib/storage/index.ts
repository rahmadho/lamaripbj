import { randomUUID } from "crypto";
import path from "path";
import { prisma } from "@/lib/db";
import { LocalStorageProvider } from "./local";
import { MinioStorageProvider } from "./minio";
import { SKEMA_DEFAULT, type Skema, type StorageProvider } from "./types";

/**
 * Registry backend penyimpanan.
 *
 * Backend aktif untuk upload baru dipilih lewat env `STORAGE_BACKEND`.
 * Membaca/menghapus selalu mengikuti prefix pada `storedName`, sehingga
 * file lama di disk dan file baru di MinIO dapat hidup berdampingan.
 */
const PROVIDERS: Partial<Record<Skema, StorageProvider>> = {
  local: new LocalStorageProvider(),
  minio: new MinioStorageProvider(),
};

const PREFIX_SEP = ":";

// Skema yang dikenali saat parsing — sengaja TIDAK terikat pada registry
// provider, agar `storedName` berprefix `minio:` tetap bisa diparse (dan
// dilaporkan dengan jelas) walau backend-nya belum diimplementasikan.
const SKEMA_DIKENAL: readonly Skema[] = ["local", "minio"];

/**
 * Pisahkan `storedName` menjadi skema + key.
 *
 * Data lama (sebelum abstraksi) tidak punya prefix → dianggap `local`, sehingga
 * file lama tetap terbaca tanpa perlu di-upload ulang.
 */
export function parseStoredName(storedName: string): { skema: Skema; key: string } {
  const idx = storedName.indexOf(PREFIX_SEP);
  if (idx > 0) {
    const skema = storedName.slice(0, idx);
    const key = storedName.slice(idx + 1);
    if ((SKEMA_DIKENAL as readonly string[]).includes(skema) && key.length > 0) {
      return { skema: skema as Skema, key };
    }
  }
  // fallback: nama lama tanpa prefix = backend default
  return { skema: SKEMA_DEFAULT, key: storedName };
}

/** Bentuk `storedName` tersimpan dari skema + key. */
export function buildStoredName(skema: Skema, key: string): string {
  // Skema default tidak diberi prefix agar nama tetap ringkas & kompatibel.
  return skema === SKEMA_DEFAULT ? key : `${skema}${PREFIX_SEP}${key}`;
}

/** Aktifkan backend non-default lewat env, mis. `STORAGE_BACKEND=minio`. */
export function skemaAktif(): Skema {
  const v = process.env.STORAGE_BACKEND?.trim() as Skema | undefined;
  return v && (SKEMA_DIKENAL as readonly string[]).includes(v) ? v : SKEMA_DEFAULT;
}

function providerUntuk(skema: Skema): StorageProvider {
  const p = PROVIDERS[skema];
  if (!p) {
    throw new Error(
      `Backend storage "${skema}" belum terdaftar. Tambahkan implementasinya di lib/storage/ lalu daftarkan di PROVIDERS.`
    );
  }
  return p;
}

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

/**
 * Simpan file dan kembalikan id `FileObj`.
 *
 * @param file        file dari FormData
 * @param validasi    dipanggil sebelum menulis; melempar untuk menolak
 * @param folderLogis prefix key opsional (mis. `"pbj"`) untuk merapikan objek
 *                    di dalam bucket/disk
 */
export async function saveFile(
  file: File,
  opts?: { folderLogis?: string; validasi?: (f: File) => void }
): Promise<string> {
  opts?.validasi?.(file);

  const skema = skemaAktif();
  const ext = path.extname(file.name) || "";
  const base = `${randomUUID()}${ext}`;
  const key = opts?.folderLogis ? `${opts.folderLogis}/${base}` : base;
  const storedName = buildStoredName(skema, key);

  const buffer = Buffer.from(await file.arrayBuffer());
  await providerUntuk(skema).put(key, buffer);

  const rec = await prisma.fileObj.create({
    data: {
      fileName: file.name,
      storedName,
      mimeType: file.type,
      size: file.size,
    },
  });
  return rec.id;
}

/**
 * Buka stream baca untuk `storedName` dari DB — backend dipilih otomatis
 * berdasarkan prefix, sehingga file lama dan baru bisa hidup berdampingan.
 */
export async function readFileStream(storedName: string) {
  const { skema, key } = parseStoredName(storedName);
  return providerUntuk(skema).getStream(key);
}

/** Hapus objek fisik. Aman dipanggil walau objek sudah tidak ada. */
export async function removeFile(storedName: string): Promise<void> {
  const { skema, key } = parseStoredName(storedName);
  await providerUntuk(skema).remove(key);
}

/** Cek keberadaan objek tanpa membuka seluruh isinya. */
export async function fileExists(storedName: string): Promise<boolean> {
  try {
    const s = await readFileStream(storedName);
    s.destroy();
    return true;
  } catch {
    return false;
  }
}
