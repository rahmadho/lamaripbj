import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Uji logika createArsipPbjBatch: pemetaan file per jenis dokumen,
 * ketahanan parsial (satu gagal tidak membatalkan yang lain), dan
 * penolakan saat tidak ada dokumen yang berhasil.
 */

const mockSession = { user: { id: "u1", role: "ADMIN", nama: "Admin" } };

vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(async () => mockSession),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/server/audit", () => ({ logAudit: vi.fn(async () => ({}) ) }));

const dibuat: Record<string, unknown>[] = [];
const adaDuplikat = new Set<string>();

vi.mock("@/lib/db", () => ({
  prisma: {
    grup: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === "grup-1" ? { id: where.id } : null
      ),
    },
    user: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id: string) => ({ id }))
      ),
    },
    paketPbj: {
      upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({
        id: "paket-1",
        ...create,
      })),
    },
    taksonomiJenisDoc: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === "doc-hilang" ? null : { id: where.id }
      ),
    },
    arsipPbj: {
      findUnique: vi.fn(async ({ where }: { where: { paketKode_taksonomiJenisDocId: { taksonomiJenisDocId: string } } }) =>
        adaDuplikat.has(where.paketKode_taksonomiJenisDocId.taksonomiJenisDocId) ? { id: "dup" } : null
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        dibuat.push(data);
        return { id: `arsip-${dibuat.length}` };
      }),
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  saveFile: vi.fn(async (file: File) => `file-${file.name}`),
  validateFile: vi.fn(),
}));

vi.mock("@/lib/paket", async (orig) => {
  const actual = await orig<typeof import("@/lib/paket")>();
  return {
    ...actual,
    getByKode: vi.fn(async (kode: string) =>
      kode === "PKT-OK"
        ? {
            kode,
            nama: "Paket Uji",
            jenisPengadaan: "KONSTRUKSI",
            metodePengadaan: "TENDER",
            tahun: 2026,
            jenisList: ["Pekerjaan Konstruksi"],
          }
        : null
    ),
  };
});

const { createArsipPbjBatch } = await import("../src/server/actions/arsip-pbj");

function berkas(nama: string, isi = "x") {
  return new File([isi], nama, { type: "application/pdf" });
}

function fd(docIds: { id: string; nama: string; file?: File }[], kode = "PKT-OK") {
  const f = new FormData();
  f.set("paketKode", kode);
  f.set("tipePaket", "1");
  f.set("grupId", "grup-1");
  f.set("keterangan", "catatan uji");
  f.set("items", JSON.stringify(docIds.map((d) => ({ jenisDocId: d.id, nama: d.nama }))));
  for (const d of docIds) if (d.file) f.set(`file:${d.id}`, d.file);
  return f;
}

beforeEach(() => {
  dibuat.length = 0;
  adaDuplikat.clear();
});

describe("createArsipPbjBatch", () => {
  it("menyimpan 2 dokumen sekaligus dengan file yang benar", async () => {
    const res = await createArsipPbjBatch(
      fd([
        { id: "doc-a", nama: "Berita Acara", file: berkas("ba.pdf") },
        { id: "doc-b", nama: "Kontrak", file: berkas("kontrak.pdf") },
      ])
    );
    expect(res).toMatchObject({ ok: true, jumlah: 2, gagal: [] });
    expect(dibuat).toHaveLength(2);
    expect(dibuat.map((d) => d.taksonomiJenisDocId)).toEqual(["doc-a", "doc-b"]);
    expect(dibuat.every((d) => d.paketNama === "Paket Uji")).toBe(true);
    expect(dibuat[0].keterangan).toBe("catatan uji");
    // dokumen ter-link ke paket & otomatis ter-share ke grup
    expect(dibuat.every((d) => d.paketId === "paket-1")).toBe(true);
    const shares = dibuat.flatMap((d) => (d.shares as { create: { grupId: string } }).create);
    expect(shares.every((s) => s.grupId === "grup-1")).toBe(true);
  });

  it("grup opsional, tapi minimal ada grup ATAU perorangan", async () => {
    // tanpa grup, dengan 1 perorangan → berhasil, share user dibuat
    const tanpaGrup = fd([{ id: "doc-a", nama: "BA", file: berkas("ba.pdf") }]);
    tanpaGrup.delete("grupId");
    tanpaGrup.set("userIds", JSON.stringify(["user-1"]));
    const res = await createArsipPbjBatch(tanpaGrup);
    expect(res).toMatchObject({ ok: true, jumlah: 1 });
    const share = (dibuat[0].shares as { create: { userId?: string; grupId?: string }[] }).create;
    expect(share.some((s) => s.userId === "user-1")).toBe(true);

    // tanpa keduanya → ditolak
    const kosong = fd([{ id: "doc-a", nama: "BA", file: berkas("ba.pdf") }]);
    kosong.delete("grupId");
    expect(await createArsipPbjBatch(kosong)).toMatchObject({
      ok: false,
      error: "Pilih minimal satu grup atau perorangan penerima",
    });

    // grup palsu → ditolak
    const grupPalsu = fd([{ id: "doc-a", nama: "BA", file: berkas("ba.pdf") }]);
    grupPalsu.set("grupId", "grup-palsu");
    expect(await createArsipPbjBatch(grupPalsu)).toMatchObject({
      ok: false,
      error: "Grup tidak ditemukan",
    });
  });

  it("baris tanpa file dilaporkan gagal, tidak menyimpan file kosong", async () => {
    const res = await createArsipPbjBatch(
      fd([
        { id: "doc-a", nama: "Berita Acara", file: berkas("ba.pdf") },
        { id: "doc-b", nama: "Kontrak" }, // dikirim tapi tanpa file
      ])
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.jumlah).toBe(1);
      expect(res.gagal).toHaveLength(1);
      expect(res.gagal[0].nama).toBe("Kontrak");
      expect(res.gagal[0].pesan).toContain("belum dipilih");
    }
  });

  it("satu gagal (jenis dokumen hilang) tidak membatalkan yang lain", async () => {
    const res = await createArsipPbjBatch(
      fd([
        { id: "doc-a", nama: "Berita Acara", file: berkas("ba.pdf") },
        { id: "doc-hilang", nama: "Dokumen Rusak", file: berkas("rusak.pdf") },
      ])
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.jumlah).toBe(1);
      expect(res.gagal).toHaveLength(1);
      expect(res.gagal[0].nama).toBe("Dokumen Rusak");
    }
  });

  it("gagal total bila semua dokumen bermasalah → ok:false", async () => {
    adaDuplikat.add("doc-a");
    const res = await createArsipPbjBatch(
      fd([{ id: "doc-a", nama: "Berita Acara", file: berkas("ba.pdf") }])
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("Tidak ada dokumen yang berhasil");
  });

  it("menolak bila paket tidak ditemukan di API", async () => {
    const res = await createArsipPbjBatch(
      fd([{ id: "doc-a", nama: "BA", file: berkas("ba.pdf") }], "PKT-PALSU")
    );
    expect(res).toMatchObject({ ok: false });
    if (!res.ok) expect(res.error).toContain("Paket tidak ditemukan");
  });

  it("menolak bila tidak ada jenis dokumen dipilih", async () => {
    const f = new FormData();
    f.set("paketKode", "PKT-OK");
    f.set("items", "[]");
    const res = await createArsipPbjBatch(f);
    expect(res).toMatchObject({ ok: false });
  });
});
