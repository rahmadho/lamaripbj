import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

// provider membaca STORAGE_DIR saat import -> set sebelum import
const DIR = await mkdtemp(path.join(tmpdir(), "lamari-storage-"));
process.env.STORAGE_DIR = DIR;

vi.mock("@/lib/db", () => ({ prisma: { fileObj: { create: vi.fn() } } }));

const { LocalStorageProvider, storageDir } = await import("../src/lib/storage/local");

let provider: InstanceType<typeof LocalStorageProvider>;

beforeEach(() => {
  provider = new LocalStorageProvider();
});

afterEach(async () => {
  await rm(DIR, { recursive: true, force: true });
});

describe("LocalStorageProvider", () => {
  it("STORAGE_DIR mengikuti env", () => {
    expect(storageDir).toBe(DIR);
  });

  it("put lalu getStream mengembalikan isi yang sama", async () => {
    const isi = Buffer.from("halo arsip");
    await provider.put("a.pdf", isi);
    const s = await provider.getStream("a.pdf");
    const chunks: Buffer[] = [];
    for await (const c of s) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe("halo arsip");
  });

  it("menghormati sub-folder pada key", async () => {
    await provider.put("pbj/2026/b.pdf", Buffer.from("x"));
    const isi = await readFile(path.join(DIR, "pbj", "2026", "b.pdf"), "utf8");
    expect(isi).toBe("x");
  });

  it("MENOLAK path traversal lewat .. (tidak menulis di luar STORAGE_DIR)", async () => {
    await provider.put("../../../evil.pdf", Buffer.from("jahat"));
    // tidak boleh ada file di luar DIR
    await expect(readFile(path.join(DIR, "..", "..", "evil.pdf"))).rejects.toThrow();
    // tapi tetap tersimpan aman di dalam DIR sebagai evil.pdf
    const isi = await readFile(path.join(DIR, "evil.pdf"), "utf8");
    expect(isi).toBe("jahat");
  });

  it("MENOLAK absolute path (dinetralkan ke dalam STORAGE_DIR)", async () => {
    await provider.put("/etc/passwd-uji.txt", Buffer.from("x"));
    // `/etc/...` bukan path absolut di disk, melainkan sub-folder "etc" di dalam DIR
    const isi = await readFile(path.join(DIR, "etc", "passwd-uji.txt"), "utf8");
    expect(isi).toBe("x");
    // dan TIDAK menyentuh lokasi sistem yang sebenarnya
    await expect(readFile("/etc/passwd-uji.txt", "utf8")).rejects.toThrow();
  });

  it("remove bersifat idempoten (tidak melempar bila file tidak ada)", async () => {
    await expect(provider.remove("tidak-ada.pdf")).resolves.toBeUndefined();
  });

  it("remove benar-benar menghapus file", async () => {
    await provider.put("c.pdf", Buffer.from("y"));
    await provider.remove("c.pdf");
    await expect(readFile(path.join(DIR, "c.pdf"))).rejects.toThrow();
  });
});
