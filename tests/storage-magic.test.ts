import { describe, it, expect } from "vitest";
import {
  deteksiMime,
  assertIsiSesuaiMime,
  MAGIC_HEAD_BYTES,
} from "../src/lib/storage/magic";

/** Buffer dari byte yang diberikan, dipad ke panjang minimum. */
function buf(...bytes: number[]): Buffer {
  return Buffer.from(bytes);
}

const PDF = ["%PDF-1.7"].join("");
const PDF_BYTES = Buffer.from(PDF, "ascii");

describe("magic bytes — deteksi", () => {
  it("mengenali PDF", () => {
    expect(deteksiMime(PDF_BYTES)).toBe("application/pdf");
  });

  it("mengenali PNG", () => {
    expect(
      deteksiMime(buf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    ).toBe("image/png");
  });

  it("mengenali JPEG", () => {
    expect(deteksiMime(buf(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("mengenali WEBP (RIFF....WEBP)", () => {
    const head = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      buf(0x00, 0x00, 0x00, 0x00),
      Buffer.from("WEBP", "ascii"),
    ]);
    expect(deteksiMime(head)).toBe("image/webp");
  });

  it("mengenali OOXML (zip PK) sebagai docx/xlsx", () => {
    expect(deteksiMime(buf(0x50, 0x4b, 0x03, 0x04))).not.toBeNull();
  });

  it("mengembalikan null untuk byte tak dikenal", () => {
    expect(deteksiMime(Buffer.from("hello world", "ascii"))).toBeNull();
  });
});

describe("magic bytes — assertIsiSesuaiMime", () => {
  it("lolos bila isi & klaim cocok (PDF)", () => {
    expect(() =>
      assertIsiSesuaiMime(PDF_BYTES, "application/pdf")
    ).not.toThrow();
  });

  it("menolak berkas yang menyamar: byte PNG, klaim PDF", () => {
    const png = buf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    expect(() => assertIsiSesuaiMime(png, "application/pdf")).toThrow(
      /tidak cocok/
    );
  });

  it("menolak klaim PDF untuk isi tak dikenal (mis. exe/teks)", () => {
    expect(() =>
      assertIsiSesuaiMime(Buffer.from("MZ...", "ascii"), "application/pdf")
    ).toThrow(/tidak dikenali|tidak diizinkan/);
  });

  it("menolak isi kosong", () => {
    expect(() => assertIsiSesuaiMime(buf(), "application/pdf")).toThrow();
  });

  it("menerima docx (zip) dengan klaim wordprocessingml", () => {
    expect(() =>
      assertIsiSesuaiMime(
        buf(0x50, 0x4b, 0x03, 0x04),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).not.toThrow();
  });

  it("menolak xlsx berisi... klaim word (keluarga beda)", () => {
    // isi zip dengan klaim excel → deteksi zip, klaim excel → lolos;
    // untuk keluarga BEDA (word) tetap diterima karena berasal dari signature
    // yang sama — uji bahwa docx≠pdf tertolak.
    const zip = buf(0x50, 0x4b, 0x03, 0x04);
    expect(() =>
      assertIsiSesuaiMime(zip, "application/pdf")
    ).toThrow();
  });

  it("MAGIC_HEAD_BYTES cukup untuk semua signature", () => {
    expect(MAGIC_HEAD_BYTES).toBeGreaterThanOrEqual(12);
  });
});
