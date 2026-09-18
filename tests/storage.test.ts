import { describe, it, expect, vi } from "vitest";

// router mengimpor prisma — mock agar test tetap murni (tanpa DB).
vi.mock("@/lib/db", () => ({ prisma: { fileObj: { create: vi.fn() } } }));

import { parseStoredName, buildStoredName } from "../src/lib/storage";

describe("parseStoredName", () => {
  it("nama lama tanpa prefix dianggap local (kompatibilitas file lama)", () => {
    expect(parseStoredName("abc-123.pdf")).toEqual({ skema: "local", key: "abc-123.pdf" });
  });

  it("nama berprefix minio dipisah benar", () => {
    expect(parseStoredName("minio:pbj/abc.pdf")).toEqual({
      skema: "minio",
      key: "pbj/abc.pdf",
    });
  });

  it("prefix local eksplisit juga dikenali", () => {
    expect(parseStoredName("local:abc.pdf")).toEqual({ skema: "local", key: "abc.pdf" });
  });

  it("skema tak dikenal jatuh ke default (tidak crash)", () => {
    expect(parseStoredName("gcs:abc.pdf")).toEqual({ skema: "local", key: "gcs:abc.pdf" });
  });

  it("prefix tanpa key dianggap nama polos", () => {
    expect(parseStoredName("minio:")).toEqual({ skema: "local", key: "minio:" });
  });

  it("mempertahankan sub-folder pada key", () => {
    expect(parseStoredName("minio:pegawai/2026/a.pdf").key).toBe("pegawai/2026/a.pdf");
  });
});

describe("buildStoredName", () => {
  it("skema default tidak diberi prefix", () => {
    expect(buildStoredName("local", "abc.pdf")).toBe("abc.pdf");
  });

  it("skema non-default diberi prefix", () => {
    expect(buildStoredName("minio", "pbj/abc.pdf")).toBe("minio:pbj/abc.pdf");
  });

  it("round-trip: build lalu parse menghasilkan key yang sama", () => {
    const key = "pegawai/abc-123.pdf";
    for (const skema of ["local", "minio"] as const) {
      expect(parseStoredName(buildStoredName(skema, key))).toEqual({ skema, key });
    }
  });
});
