import { describe, it, expect, vi, beforeEach } from "vitest";

// mock prisma sebelum import acl (hoisted)
const mockPrisma = vi.hoisted(() => ({
  shareEntry: { findMany: vi.fn(), findFirst: vi.fn() },
  direktori: { findUnique: vi.fn() },
  arsipPegawai: { findUnique: vi.fn() },
  arsipPbj: { findUnique: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import {
  canAccessArsipPegawai,
  canAccessArsipPbj,
  canAccessDirektori,
  arsipPbjVisibilityFilter,
  direktoriVisibilityFilter,
} from "../src/lib/acl";

function sesi(id: string, role: string) {
  return { user: { id, role, name: "x", email: "x@x" } } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("canAccessArsipPbj", () => {
  it("ADMIN selalu boleh", async () => {
    expect(await canAccessArsipPbj(sesi("u1", "ADMIN"), "a1", "DOWNLOAD")).toBe(true);
  });

  it("PIMPINAN boleh VIEW semua", async () => {
    mockPrisma.arsipPbj.findUnique.mockResolvedValue({ createdById: "lain" });
    expect(await canAccessArsipPbj(sesi("u2", "PIMPINAN"), "a1", "VIEW")).toBe(true);
  });

  it("PIMPINAN tanpa share tidak boleh DOWNLOAD", async () => {
    mockPrisma.arsipPbj.findUnique.mockResolvedValue({ createdById: "lain" });
    mockPrisma.shareEntry.findMany.mockResolvedValue([]);
    expect(await canAccessArsipPbj(sesi("u2", "PIMPINAN"), "a1", "DOWNLOAD")).toBe(false);
  });

  it("pembuat arsip boleh VIEW", async () => {
    mockPrisma.arsipPbj.findUnique.mockResolvedValue({ createdById: "u3" });
    expect(await canAccessArsipPbj(sesi("u3", "STAFF"), "a1", "VIEW")).toBe(true);
  });

  it("STAFF tanpa share ditolak", async () => {
    mockPrisma.arsipPbj.findUnique.mockResolvedValue({ createdById: "lain" });
    mockPrisma.shareEntry.findMany.mockResolvedValue([]);
    expect(await canAccessArsipPbj(sesi("u3", "STAFF"), "a1", "VIEW")).toBe(false);
  });

  it("share VIEW cukup untuk VIEW, tapi tidak untuk DOWNLOAD", async () => {
    mockPrisma.arsipPbj.findUnique.mockResolvedValue({ createdById: "lain" });
    mockPrisma.shareEntry.findMany.mockResolvedValue([{ level: "VIEW", direktoriId: null }]);
    expect(await canAccessArsipPbj(sesi("u4", "STAFF"), "a1", "VIEW")).toBe(true);
    expect(await canAccessArsipPbj(sesi("u4", "STAFF"), "a1", "DOWNLOAD")).toBe(false);
  });

  it("share DOWNLOAD (via grup) cukup untuk unduh", async () => {
    mockPrisma.arsipPbj.findUnique.mockResolvedValue({ createdById: "lain" });
    mockPrisma.shareEntry.findMany.mockResolvedValue([{ level: "DOWNLOAD", direktoriId: null }]);
    expect(await canAccessArsipPbj(sesi("u5", "PEJABAT_FUNGSIONAL"), "a1", "DOWNLOAD")).toBe(true);
  });

  it("share ke semua user memberi VIEW ke user mana pun", async () => {
    mockPrisma.arsipPbj.findUnique.mockResolvedValue({ createdById: "lain" });
    mockPrisma.shareEntry.findMany.mockResolvedValue([{ level: "VIEW", direktoriId: null }]);
    expect(await canAccessArsipPbj(sesi("u6", "STAFF"), "a1", "VIEW")).toBe(true);
  });

  it("query share menyertakan klausa semuaUser", async () => {
    mockPrisma.arsipPbj.findUnique.mockResolvedValue({ createdById: "lain" });
    mockPrisma.shareEntry.findMany.mockResolvedValue([]);
    await canAccessArsipPbj(sesi("u6", "STAFF"), "a1", "VIEW");
    const arg = mockPrisma.shareEntry.findMany.mock.calls[0]?.[0];
    expect(JSON.stringify(arg)).toContain('"semuaUser":true');
  });
});

describe("canAccessArsipPegawai", () => {
  it("pembuat boleh VIEW", async () => {
    mockPrisma.arsipPegawai.findUnique.mockResolvedValue({
      createdById: "u1",
      direktoriId: "d1",
      direktori: { id: "d1", parent: null },
    });
    expect(await canAccessArsipPegawai(sesi("u1", "STAFF"), "a1", "VIEW")).toBe(true);
  });

  it("share di direktori induk berlaku rekursif ke arsip", async () => {
    mockPrisma.arsipPegawai.findUnique.mockResolvedValue({
      createdById: "lain",
      direktoriId: "d2",
      direktori: { id: "d2", parent: { id: "d1", parent: null } },
    });
    mockPrisma.shareEntry.findMany.mockResolvedValue([
      { izin: ["VIEW", "DOWNLOAD"], level: "DOWNLOAD", direktoriId: "d1" },
    ]);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "DOWNLOAD")).toBe(true);
  });

  it("tanpa share ditolak", async () => {
    mockPrisma.arsipPegawai.findUnique.mockResolvedValue({
      createdById: "lain",
      direktoriId: "d2",
      direktori: { id: "d2", parent: null },
    });
    mockPrisma.shareEntry.findMany.mockResolvedValue([]);
    expect(await canAccessArsipPegawai(sesi("u9", "UPLOADER"), "a1", "VIEW")).toBe(false);
  });

  it("share VIEW di direktori tidak cukup untuk DOWNLOAD arsip di dalamnya (bug: Lihat bisa unduh)", async () => {
    mockPrisma.arsipPegawai.findUnique.mockResolvedValue({
      createdById: "lain",
      direktoriId: "d2",
      direktori: { id: "d2", parent: { id: "d1", parent: null } },
    });
    mockPrisma.shareEntry.findMany.mockResolvedValue([
      { izin: ["VIEW"], level: "VIEW", direktoriId: "d2" },
    ]);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "VIEW")).toBe(true);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "DOWNLOAD")).toBe(false);
  });

  it("share DOWNLOAD di direktori induk cukup untuk VIEW dan DOWNLOAD", async () => {
    mockPrisma.arsipPegawai.findUnique.mockResolvedValue({
      createdById: "lain",
      direktoriId: "d2",
      direktori: { id: "d2", parent: { id: "d1", parent: null } },
    });
    mockPrisma.shareEntry.findMany.mockResolvedValue([
      { izin: ["VIEW", "DOWNLOAD"], level: "DOWNLOAD", direktoriId: "d1" },
    ]);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "VIEW")).toBe(true);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "DOWNLOAD")).toBe(true);
  });

  it("share VIEW langsung di arsip (arsipPegawaiId) tidak cukup untuk DOWNLOAD", async () => {
    mockPrisma.arsipPegawai.findUnique.mockResolvedValue({
      createdById: "lain",
      direktoriId: "d2",
      direktori: { id: "d2", parent: null },
    });
    mockPrisma.shareEntry.findMany.mockResolvedValue([
      { izin: ["VIEW"], level: "VIEW", direktoriId: null },
    ]);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "DOWNLOAD")).toBe(false);
  });

  it("override: share sub (VIEW) menutup izin DOWNLOAD dari induk", async () => {
    // arsip di sub (d2, anak d1). Satu query mengambil share d2 & d1;
    // karena d2 PUNYA share, rantai berhenti & izin induk d1 tidak dipakai.
    mockPrisma.arsipPegawai.findUnique.mockResolvedValue({
      createdById: "lain",
      direktoriId: "d2",
      direktori: { id: "d2", parent: { id: "d1", parent: null } },
    });
    mockPrisma.shareEntry.findMany.mockResolvedValue([
      { izin: ["VIEW"], level: "VIEW", direktoriId: "d2" },
      { izin: ["DOWNLOAD"], level: "DOWNLOAD", direktoriId: "d1" },
    ]);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "VIEW")).toBe(true);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "DOWNLOAD")).toBe(false);
    // satu query per pemanggilan (bukan per direktori dalam rantai)
    expect(mockPrisma.shareEntry.findMany).toHaveBeenCalledTimes(2);
  });

  it("izin granular UPLOAD/DELETE/CREATE_SUBDIR dihormati", async () => {
    mockPrisma.arsipPegawai.findUnique.mockResolvedValue({
      createdById: "lain",
      direktoriId: "d2",
      direktori: { id: "d2", parent: null },
    });
    mockPrisma.shareEntry.findMany.mockResolvedValue([
      { izin: ["VIEW", "UPLOAD", "CREATE_SUBDIR"], level: "DOWNLOAD", direktoriId: "d2" },
    ]);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "UPLOAD")).toBe(true);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "CREATE_SUBDIR")).toBe(true);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "DELETE")).toBe(false);
    expect(await canAccessArsipPegawai(sesi("u9", "STAFF"), "a1", "DOWNLOAD")).toBe(false);
  });
});

describe("canAccessDirektori", () => {
  it("owner punya semua izin", async () => {
    mockPrisma.direktori.findUnique.mockResolvedValue({
      ownerId: "u1",
      id: "d1",
      parent: null,
    });
    expect(await canAccessDirektori(sesi("u1", "STAFF"), "d1", "DELETE")).toBe(true);
  });

  it("ADMIN punya semua izin", async () => {
    expect(await canAccessDirektori(sesi("u1", "ADMIN"), "d1", "DELETE")).toBe(true);
  });

  it("bukan owner tanpa share ditolak", async () => {
    mockPrisma.direktori.findUnique.mockResolvedValue({
      ownerId: "lain",
      id: "d1",
      parent: null,
    });
    mockPrisma.shareEntry.findMany.mockResolvedValue([]);
    expect(await canAccessDirektori(sesi("u9", "STAFF"), "d1", "VIEW")).toBe(false);
  });
});

describe("filter visibilitas", () => {
  it("arsipPbjVisibilityFilter ADMIN = kosong", () => {
    expect(arsipPbjVisibilityFilter(sesi("u1", "ADMIN"))).toEqual({});
  });

  it("arsipPbjVisibilityFilter STAFF = OR terbatas", () => {
    const f = arsipPbjVisibilityFilter(sesi("u1", "STAFF"));
    expect(f).toHaveProperty("OR");
  });

  it("filter menyertakan share semuaUser", () => {
    const pbj = JSON.stringify(arsipPbjVisibilityFilter(sesi("u1", "STAFF")));
    const dir = JSON.stringify(direktoriVisibilityFilter(sesi("u1", "STAFF")));
    expect(pbj).toContain('"semuaUser":true');
    expect(dir).toContain('"semuaUser":true');
  });

  it("direktoriVisibilityFilter tanpa sesi = id none", () => {
    expect(direktoriVisibilityFilter(null)).toEqual({ id: "none" });
  });
});
