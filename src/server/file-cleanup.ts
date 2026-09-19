import "server-only";
import { removeFile } from "@/lib/storage";
import { logAudit } from "@/server/audit";

/**
 * Hapus objek fisik secara best-effort SETELAH transaksi DB commit.
 *
 * Kegagalan hapus fisik tidak boleh menggagalkan aksi bisnis (baris DB sudah
 * hilang), tetapi WAJIB tercatat di audit agar dapat direkonsiliasi manual —
 * jangan ditelan senyap.
 *
 * Catatan: jangan panggil ini DI DALAM `$transaction` — hapus fisik bukan
 * transaksional dan tidak bisa di-rollback.
 */
export async function hapusFisikBestEffort(
  storedName: string | null | undefined,
  userId: string,
  entitas: string,
  entitasId: string
): Promise<void> {
  if (!storedName) return;
  try {
    await removeFile(storedName);
  } catch (e) {
    await logAudit({
      userId,
      aksi: "DELETE_FILE_GAGAL",
      entitas,
      entitasId,
      detail: { storedName, pesan: e instanceof Error ? e.message : String(e) },
    });
  }
}
