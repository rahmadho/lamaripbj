import type { JenisPengadaan } from "@prisma/client";

export type Paket = {
  kode: string;
  nama: string;
  jenisPengadaan: JenisPengadaan;
  metodePengadaan: string;
  tahun: number;
  /** Jenis dokumen mentah dari API (bisa lebih dari satu). */
  jenisList: string[];
};

/**
 * Parameter `type` pada endpoint Sipedal — menentukan sumber data paket.
 * 1 => Tender, 2 => Nontender, 3 => e-Katalog
 */
export const TIPE_PAKET = [
  { value: "1", label: "Tender" },
  { value: "2", label: "Nontender" },
  { value: "3", label: "e-Katalog" },
] as const;

export type TipePaketValue = (typeof TIPE_PAKET)[number]["value"];

export function labelTipe(type: string): string {
  return TIPE_PAKET.find((t) => t.value === type)?.label ?? type;
}

/* ── Pemetaan teks bebas dari API ke enum internal ────────────────── */

function normalisasi(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

/** "Pekerjaan Konstruksi" → KONSTRUKSI, "Jasa Konsultansi" → JASA_KONSULTANSI, dst. */
export function mapJenis(teks: string): JenisPengadaan {
  const n = normalisasi(teks);
  if (n.includes("konstruksi")) return "KONSTRUKSI";
  if (n.includes("konsultan")) return "JASA_KONSULTANSI";
  if (n.includes("lainnya")) return "JASA_LAINNYA";
  return "BARANG";
}

/** "Tender Cepat" → TENDER_CEPAT, "e-Purchasing"/"e-Katalog" → E_PURCHASING, dst. */
export function mapMetode(teks: string, fallbackType?: TipePaketValue): string {
  const n = normalisasi(teks);
  if (n.includes("tendercepat")) return "TENDER_CEPAT";
  if (n.includes("tender")) return "TENDER";
  if (n.includes("seleksi")) return "SELEKSI";
  if (n.includes("penunjukanlangsung")) return "PENUNJUKAN_LANGSUNG";
  if (n.includes("pengadaanlangsung")) return "PENGADAAN_LANGSUNG";
  if (n.includes("purchasing") || n.includes("katalog")) return "E_PURCHASING";
  if (n.includes("dikecualikan")) return "DIKECUALIKAN";
  // fallback bila API tidak mengirim metode
  if (fallbackType === "1") return "TENDER";
  if (fallbackType === "3") return "E_PURCHASING";
  return teks;
}

/* ── Error yang membawa pesan asli dari API ───────────────────────── */

export class PaketApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaketApiError";
  }
}

/* ── Provider: Sipedal API ────────────────────────────────────────── */

const DEFAULT_BASE = "https://sipedal.sumbarprov.go.id/api/v1/arsip/paket";

type SipedalResponse = {
  error: boolean;
  message: string;
  data:
    | { nama_paket?: string; metode?: string; jenis?: string[] | string; tahun?: number }
    | unknown[];
  count: number;
};

function baseUrl() {
  return process.env.SIPEDAL_API_BASE ?? DEFAULT_BASE;
}

function timeoutMs() {
  const n = Number(process.env.SIPEDAL_API_TIMEOUT ?? 8000);
  return Number.isFinite(n) && n > 0 ? n : 8000;
}

/**
 * Ambil detail paket dari Sipedal berdasarkan kode + tipe.
 * - `data` bukan objek / `error: true` → dianggap paket tidak ditemukan (`[]`).
 * - Kegagalan jaringan / timeout / HTTP non-2xx → melempar `PaketApiError`.
 */
export async function cariPaket({
  kode,
  type,
}: {
  kode: string;
  type: TipePaketValue;
}): Promise<Paket[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs());
  try {
    const url = `${baseUrl()}/${encodeURIComponent(kode.trim())}?type=${type}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new PaketApiError(`Layanan paket mengembalikan HTTP ${res.status}.`);

    let json: SipedalResponse;
    try {
      json = (await res.json()) as SipedalResponse;
    } catch {
      throw new PaketApiError("Respons layanan paket tidak dapat dibaca.");
    }

    // API membalas HTTP 200 walau `error: true` atau `data` berupa array kosong.
    if (json.error || !json.data || Array.isArray(json.data)) return [];

    const d = json.data as Exclude<SipedalResponse["data"], unknown[]>;
    if (!d.nama_paket) return [];

    const jenisList = Array.isArray(d.jenis) ? d.jenis : d.jenis ? [d.jenis] : [];

    return [
      {
        kode: kode.trim(),
        nama: d.nama_paket,
        // paket bisa punya >1 jenis; pakai yang pertama sebagai klasifikasi utama
        jenisPengadaan: mapJenis(jenisList[0] ?? ""),
        metodePengadaan: mapMetode(d.metode ?? "", type),
        tahun: d.tahun ?? new Date().getFullYear(),
        jenisList,
      },
    ];
  } catch (e) {
    if (e instanceof PaketApiError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new PaketApiError("Layanan paket tidak merespons (timeout).");
    }
    throw new PaketApiError("Gagal menghubungi layanan paket Sipedal.");
  } finally {
    clearTimeout(timer);
  }
}

export async function getByKode(kode: string, type: TipePaketValue = "1"): Promise<Paket | null> {
  const [satu] = await cariPaket({ kode, type });
  return satu ?? null;
}
