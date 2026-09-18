import { describe, it, expect } from "vitest";
import {
  isMimeAllowed,
  MAX_FILE_SIZE,
  validateFile,
} from "../src/lib/storage/aturan";

/** Bikin objek mirip File tanpa bergantung API browser. */
function berkas(nama: string, tipe: string, ukuran: number): File {
  return { name: nama, type: tipe, size: ukuran } as File;
}

describe("aturan berkas (client-safe)", () => {
  it("MAX_FILE_SIZE = 25 MB", () => {
    expect(MAX_FILE_SIZE).toBe(25 * 1024 * 1024);
  });

  it("mengizinkan PDF, gambar, dan Office", () => {
    expect(isMimeAllowed("application/pdf")).toBe(true);
    expect(isMimeAllowed("image/png")).toBe(true);
    expect(isMimeAllowed("image/jpeg")).toBe(true);
    expect(
      isMimeAllowed(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe(true);
  });

  it("menolak tipe di luar daftar (mis. zip/svg/teks)", () => {
    expect(isMimeAllowed("application/zip")).toBe(false);
    expect(isMimeAllowed("image/svg+xml")).toBe(false);
    expect(isMimeAllowed("text/plain")).toBe(false);
    expect(isMimeAllowed("")).toBe(false);
  });

  it("validateFile lolos untuk berkas sah", () => {
    expect(() => validateFile(berkas("sk.pdf", "application/pdf", 1024))).not.toThrow();
  });

  it("validateFile menolak tipe tidak diizinkan", () => {
    expect(() => validateFile(berkas("arsip.zip", "application/zip", 1024))).toThrow(
      /Tipe file tidak diizinkan/
    );
  });

  it("validateFile menolak berkas melebihi 25 MB", () => {
    expect(() =>
      validateFile(berkas("besar.pdf", "application/pdf", MAX_FILE_SIZE + 1))
    ).toThrow(/melebihi 25 MB/);
  });

  it("validateFile menerima tepat di batas ukuran", () => {
    expect(() =>
      validateFile(berkas("pas.pdf", "application/pdf", MAX_FILE_SIZE))
    ).not.toThrow();
  });
});
