import { describe, it, expect } from "vitest";
import { deretHalaman } from "../src/lib/pagination";

describe("deretHalaman", () => {
  it("total 0 → kosong", () => {
    expect(deretHalaman(1, 0)).toEqual([]);
  });

  it("total ≤ 7 → semua nomor tanpa elipsis", () => {
    expect(deretHalaman(1, 1)).toEqual([1]);
    expect(deretHalaman(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(deretHalaman(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("di awal → elipsis hanya di kanan", () => {
    expect(deretHalaman(1, 20)).toEqual([1, 2, "…", 20]);
    expect(deretHalaman(3, 20)).toEqual([1, 2, 3, 4, "…", 20]);
  });

  it("di tengah → elipsis di kedua sisi", () => {
    expect(deretHalaman(10, 20)).toEqual([1, "…", 9, 10, 11, "…", 20]);
  });

  it("di akhir → elipsis hanya di kiri", () => {
    expect(deretHalaman(20, 20)).toEqual([1, "…", 19, 20]);
    expect(deretHalaman(18, 20)).toEqual([1, "…", 17, 18, 19, 20]);
  });

  it("selalu memuat halaman pertama & terakhir", () => {
    for (const h of [1, 5, 10, 15, 20]) {
      const r = deretHalaman(h, 20);
      expect(r[0]).toBe(1);
      expect(r[r.length - 1]).toBe(20);
    }
  });

  it("selalu memuat halaman aktif", () => {
    for (const h of [1, 4, 7, 12, 20]) {
      expect(deretHalaman(h, 20)).toContain(h);
    }
  });
});
