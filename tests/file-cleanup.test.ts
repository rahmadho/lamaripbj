import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Uji helper hapus fisik best-effort: objek fisik dihapus, dan kegagalan
 * hapus TIDAK ditelan senyap — tercatat sebagai audit DELETE_FILE_GAGAL.
 */

const mockRemoveFile = vi.fn();
const mockLogAudit = vi.fn();

vi.mock("@/lib/storage", () => ({
  removeFile: (storedName: string) => mockRemoveFile(storedName),
}));

vi.mock("@/server/audit", () => ({
  logAudit: (p: unknown) => mockLogAudit(p),
}));

const { hapusFisikBestEffort } = await import("../src/server/file-cleanup");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("hapusFisikBestEffort", () => {
  it("memanggil removeFile untuk storedName yang ada", async () => {
    mockRemoveFile.mockResolvedValue(undefined);
    await hapusFisikBestEffort("pegawai/abc.pdf", "u1", "ArsipPegawai", "a1");
    expect(mockRemoveFile).toHaveBeenCalledWith("pegawai/abc.pdf");
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it("melewati (no-op) bila storedName kosong/null", async () => {
    await hapusFisikBestEffort(null, "u1", "ArsipPbj", "a1");
    await hapusFisikBestEffort(undefined, "u1", "ArsipPbj", "a1");
    expect(mockRemoveFile).not.toHaveBeenCalled();
  });

  it("mencatat audit DELETE_FILE_GAGAL saat removeFile melempar", async () => {
    mockRemoveFile.mockRejectedValue(new Error("disk penuh"));
    await hapusFisikBestEffort("pbj/x.pdf", "u1", "ArsipPbj", "a1");
    expect(mockLogAudit).toHaveBeenCalledTimes(1);
    const arg = mockLogAudit.mock.calls[0][0] as {
      aksi: string;
      entitas: string;
      entitasId: string;
      detail: { storedName: string; pesan: string };
    };
    expect(arg.aksi).toBe("DELETE_FILE_GAGAL");
    expect(arg.entitas).toBe("ArsipPbj");
    expect(arg.entitasId).toBe("a1");
    expect(arg.detail.storedName).toBe("pbj/x.pdf");
    expect(arg.detail.pesan).toContain("disk penuh");
  });
});
