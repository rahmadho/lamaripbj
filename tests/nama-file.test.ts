import { describe, it, expect } from "vitest";
import { ekstensiAsli, namaFilePegawai, namaFilePbj } from "../src/lib/nama-file";

describe("ekstensiAsli", () => {
  it("mengambil ekstensi lengkap", () => {
    expect(ekstensiAsli("berita-acara.pdf")).toBe(".pdf");
    expect(ekstensiAsli("dokumen.tar.gz")).toBe(".gz");
    expect(ekstensiAsli("tanpa-ext")).toBe("");
  });
});

describe("namaFilePegawai", () => {
  it("menyusun urutan uploader_parent_dir_date_nomor_nama", () => {
    const nama = namaFilePegawai({
      uploader: "Budi Santoso",
      parentDir: "Kepegawaian",
      dir: "SK",
      tanggal: new Date(2026, 4, 9), // 9 Mei 2026
      nomor: "800/123/2026",
      namaDokumen: "SK Kenaikan Pangkat",
      ext: ".pdf",
    });
    expect(nama).toContain("Budi Santoso");
    expect(nama).toContain("Kepegawaian");
    expect(nama).toContain("SK");
    expect(nama).toContain("20260509");
    expect(nama).toContain("SK Kenaikan Pangkat");
    expect(nama.endsWith(".pdf")).toBe(true);
    // pemisah antar segmen
    expect(nama.split("_").length).toBe(6);
  });

  it("mempertahankan seluruh segmen walau ada yang kosong", () => {
    const nama = namaFilePegawai({
      uploader: "Ani",
      parentDir: null,
      dir: "Umum",
      tanggal: new Date(2026, 0, 1),
      nomor: null,
      namaDokumen: "Nota",
      ext: ".docx",
    });
    expect(nama).toBe("Ani_Umum_20260101_Nota.docx");
  });

  it("membersihkan karakter ilegal", () => {
    const nama = namaFilePegawai({
      uploader: "A/B",
      parentDir: null,
      dir: "C:D",
      tanggal: new Date(2026, 0, 1),
      nomor: "E*F",
      namaDokumen: "G?H",
      ext: ".pdf",
    });
    expect(nama).not.toMatch(/[\\/:*?"<>|]/);
  });
});

describe("namaFilePbj", () => {
  it("menyusun urutan kode_namaSingkat_jenis_metode", () => {
    const nama = namaFilePbj({
      kodePaket: "PKT-001",
      namaSingkat: "BAR",
      jenis: "Pekerjaan Konstruksi",
      metode: "Tender",
      ext: ".pdf",
    });
    expect(nama).toBe("PKT-001_BAR_Pekerjaan Konstruksi_Tender.pdf");
  });

  it("fallback ke 'dokumen' bila semua segmen kosong", () => {
    const nama = namaFilePbj({
      kodePaket: "",
      namaSingkat: null,
      jenis: null,
      metode: undefined,
      ext: ".pdf",
    });
    expect(nama).toBe("dokumen.pdf");
  });
});
