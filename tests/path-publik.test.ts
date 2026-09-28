import { describe, it, expect } from "vitest";
import { diBawah, isPublik } from "../src/lib/path-publik";

const PUBLIK = ["/login", "/panduan", "/hubungi-kami", "/api/auth"];

describe("diBawah — boundary segmen path", () => {
  it("cocok saat tepat sama", () => {
    expect(diBawah("/login", "/login")).toBe(true);
  });

  it("cocok untuk sub-path", () => {
    expect(diBawah("/login/bantuan", "/login")).toBe(true);
    expect(diBawah("/api/auth/callback/credentials", "/api/auth")).toBe(true);
  });

  it("TIDAK cocok untuk prefix tanpa boundary (kasus berbahaya)", () => {
    expect(diBawah("/login-lain", "/login")).toBe(false);
    expect(diBawah("/loginAdmin", "/login")).toBe(false);
    expect(diBawah("/api/authz", "/api/auth")).toBe(false);
    expect(diBawah("/panduan-rahasia", "/panduan")).toBe(false);
  });

  it("tidak cocok untuk path berbeda", () => {
    expect(diBawah("/dashboard", "/login")).toBe(false);
  });
});

describe("isPublik — daftar path publik", () => {
  it("rute publik dikenali", () => {
    expect(isPublik("/login", PUBLIK)).toBe(true);
    expect(isPublik("/panduan", PUBLIK)).toBe(true);
    expect(isPublik("/panduan/x", PUBLIK)).toBe(true);
    expect(isPublik("/hubungi-kami", PUBLIK)).toBe(true);
    expect(isPublik("/api/auth/session", PUBLIK)).toBe(true);
  });

  it("rute terproteksi TIDAK dianggap publik", () => {
    expect(isPublik("/dashboard", PUBLIK)).toBe(false);
    expect(isPublik("/pengguna", PUBLIK)).toBe(false);
    expect(isPublik("/api/files/abc", PUBLIK)).toBe(false);
    expect(isPublik("/api/export", PUBLIK)).toBe(false);
  });

  it("prefix mirip-publik tidak membocorkan rute (regresi)", () => {
    expect(isPublik("/login-lain", PUBLIK)).toBe(false);
    expect(isPublik("/api/authz", PUBLIK)).toBe(false);
    expect(isPublik("/hubungi-kami-internal", PUBLIK)).toBe(false);
  });
});
