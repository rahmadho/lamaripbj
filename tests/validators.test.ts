import { describe, it, expect } from "vitest";
import { shareSchema } from "../src/lib/validators";

const subjek = { direktoriId: "d1" };
const izin = ["VIEW"];

describe("shareSchema — target majemuk", () => {
  it("menerima banyak pengguna sekaligus", () => {
    const r = shareSchema.safeParse({
      ...subjek,
      izin,
      userIds: ["u1", "u2", "u3"],
    });
    expect(r.success).toBe(true);
  });

  it("menerima banyak role sekaligus", () => {
    const r = shareSchema.safeParse({
      ...subjek,
      izin,
      roles: ["STAFF", "PIMPINAN"],
    });
    expect(r.success).toBe(true);
  });

  it("menerima campuran pengguna & role? — hanya satu jenis (ditolak)", () => {
    const r = shareSchema.safeParse({
      ...subjek,
      izin,
      userIds: ["u1"],
      roles: ["STAFF"],
    });
    expect(r.success).toBe(false);
  });

  it("menerima bentuk tunggal (kompatibilitas)", () => {
    expect(shareSchema.safeParse({ ...subjek, izin, userId: "u1" }).success).toBe(true);
    expect(shareSchema.safeParse({ ...subjek, izin, role: "STAFF" }).success).toBe(true);
  });

  it("menolak tanpa target", () => {
    const r = shareSchema.safeParse({ ...subjek, izin });
    expect(r.success).toBe(false);
  });

  it("menolak array kosong tanpa semuaUser", () => {
    const r = shareSchema.safeParse({ ...subjek, izin, userIds: [] });
    expect(r.success).toBe(false);
  });

  it("semuaUser valid sendiri", () => {
    expect(shareSchema.safeParse({ ...subjek, izin, semuaUser: true }).success).toBe(true);
  });

  it("PBJ wajib grup, boleh banyak grup", () => {
    const ok = shareSchema.safeParse({
      arsipPbjId: "a1",
      level: "VIEW",
      grupIds: ["g1", "g2"],
    });
    expect(ok.success).toBe(true);
    const bad = shareSchema.safeParse({ arsipPbjId: "a1", level: "VIEW" });
    expect(bad.success).toBe(false);
    const badGrupTunggal = shareSchema.safeParse({
      arsipPbjId: "a1",
      level: "VIEW",
      grupId: "g1",
    });
    expect(badGrupTunggal.success).toBe(true);
  });

  it("grup dilarang untuk arsip pegawai", () => {
    const r = shareSchema.safeParse({ ...subjek, izin, grupIds: ["g1"] });
    expect(r.success).toBe(false);
  });

  it("non-PBJ wajib punya izin", () => {
    const r = shareSchema.safeParse({ ...subjek, userIds: ["u1"] });
    expect(r.success).toBe(false);
  });
});
