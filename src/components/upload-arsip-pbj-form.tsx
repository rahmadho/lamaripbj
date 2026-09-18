"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createArsipPbjBatch } from "@/server/actions/arsip-pbj";
import { TIPE_PAKET, type Paket, type TipePaketValue } from "@/lib/paket";
import { labelJenis, labelMetode } from "@/lib/pbj";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileUp,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

type JenisDoc = { id: string; nama: string };
type Baris = {
  docId: string;
  nama: string;
  file: File | null;
};

const fmtSize = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

export function UploadArsipPbjForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);

  // pencarian paket dari API Sipedal
  const [tipe, setTipe] = useState<TipePaketValue>("1");
  const [kode, setKode] = useState("");
  const [loadingPaket, setLoadingPaket] = useState(false);
  const [pesanPaket, setPesanPaket] = useState<string | null>(null);
  const [paket, setPaket] = useState<Paket | null>(null);

  // daftar dokumen yang akan diunggah
  const [baris, setBaris] = useState<Baris[]>([]);
  const [keterangan, setKeterangan] = useState("");

  // grup (opsional) & perorangan penerima share saat unggah
  const [grups, setGrups] = useState<{ id: string; nama: string }[]>([]);
  const [grupId, setGrupId] = useState("");
  const [pengguna, setPengguna] = useState<{ id: string; nama: string; email: string; role: string }[]>([]);
  const [penerimaIds, setPenerimaIds] = useState<string[]>([]);
  const [cariUser, setCariUser] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/grup-saya")
      .then((r) => r.json())
      .then((j) => setGrups(j.data ?? []))
      .catch(() => setGrups([]));
    fetch("/api/pengguna-aktif")
      .then((r) => r.json())
      .then((j) => setPengguna(j.data ?? []))
      .catch(() => setPengguna([]));
  }, [open]);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fileTerpilih = useMemo(() => baris.filter((b) => b.file), [baris]);
  const bisaSimpan = Boolean(paket) && (grupId || penerimaIds.length > 0) && fileTerpilih.length > 0 && !pending;

  function resetPaket() {
    setPaket(null);
    setPesanPaket(null);
    setBaris([]);
  }

  function resetSemua() {
    resetPaket();
    setKode("");
    setTipe("1");
    setKeterangan("");
    setGrupId("");
    setPenerimaIds([]);
    setCariUser("");
    setError(null);
    setPesanSukses(null);
  }

  async function cariPaketDariApi() {
    const k = kode.trim();
    if (!k) return;

    setLoadingPaket(true);
    resetPaket();
    try {
      const res = await fetch(`/api/paket?kode=${encodeURIComponent(k)}&type=${tipe}`);
      const json = (await res.json()) as { data?: Paket[]; pesan?: string };
      const hasil = json.data?.[0] ?? null;

      if (!hasil) {
        setPesanPaket(json.pesan ?? "Paket tidak ditemukan.");
        return;
      }
      setPaket(hasil);

      // jenis dokumen yang dipetakan untuk jenis + metode paket ini
      const qs = new URLSearchParams({
        jenis: hasil.jenisPengadaan,
        metode: hasil.metodePengadaan,
      });
      const r = await fetch(`/api/jenis-dokumen?${qs}`);
      const j = (await r.json()) as { data?: JenisDoc[] };
      const daftar = j.data ?? [];
      setBaris(daftar.map((d) => ({ docId: d.id, nama: d.nama, file: null })));
    } catch {
      setPesanPaket("Gagal menghubungi layanan paket. Coba lagi.");
    } finally {
      setLoadingPaket(false);
    }
  }

  function setFile(docId: string, file: File | null) {
    setBaris((prev) => prev.map((b) => (b.docId === docId ? { ...b, file } : b)));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paket) {
      setError("Cari paket terlebih dahulu.");
      return;
    }
    if (fileTerpilih.length === 0) {
      setError("Pilih minimal satu berkas untuk diunggah.");
      return;
    }

    const fd = new FormData();
    fd.set("paketKode", paket.kode);
    fd.set("tipePaket", tipe);
    fd.set("grupId", grupId);
    fd.set("userIds", JSON.stringify(penerimaIds));
    fd.set("keterangan", keterangan);
    fd.set(
      "items",
      JSON.stringify(fileTerpilih.map((b) => ({ jenisDocId: b.docId, nama: b.nama })))
    );
    for (const b of fileTerpilih) {
      if (b.file) fd.set(`file:${b.docId}`, b.file);
    }

    setError(null);
    setPesanSukses(null);
    start(async () => {
      const res = await createArsipPbjBatch(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // berhasil sebagian / seluruhnya
      setBaris((prev) => prev.map((b) => ({ ...b, file: null })));
      for (const k of Object.keys(inputRefs.current)) {
        if (inputRefs.current[k]) inputRefs.current[k]!.value = "";
      }
      setKeterangan("");
      setPesanSukses(
        res.gagal.length > 0
          ? `${res.jumlah} dokumen tersimpan, ${res.gagal.length} gagal.`
          : `${res.jumlah} dokumen berhasil diunggah.`
      );
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetSemua();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>+ Unggah Arsip PBJ</DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] w-[96vw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="font-heading">Unggah Arsip Pengadaan</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cari paket dari Sipedal, lalu unggah seluruh berkas dokumen sekaligus.
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Langkah 1 — cari paket */}
            <section className="space-y-3">
              <Langkah n="1" judul="Pilih Paket dari Sipedal" />
              <div className="rounded-lg border border-border bg-surface-subtle/40 p-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="sm:w-40 sm:shrink-0">
                    <Label htmlFor="pbj-tipe" className="mb-1.5 block">
                      Tipe Sumber Data
                    </Label>
                    <Select
                      items={TIPE_PAKET}
                      value={tipe}
                      onValueChange={(v) => {
                        setTipe((v as TipePaketValue) ?? "1");
                        resetPaket();
                      }}
                    >
                      <SelectTrigger
                        id="pbj-tipe"
                        className="w-full"
                        aria-label="Tipe sumber data paket"
                      >
                        <SelectValue placeholder="Pilih tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPE_PAKET.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="kodeCari" className="mb-1.5 block">
                      Kode Paket
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="kodeCari"
                        value={kode}
                        onChange={(e) => setKode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void cariPaketDariApi();
                          }
                        }}
                        placeholder="mis. 10153919000"
                        inputMode="numeric"
                        className="font-mono"
                      />
                      <Button
                        type="button"
                        onClick={() => void cariPaketDariApi()}
                        disabled={loadingPaket || !kode.trim()}
                        className="shrink-0"
                      >
                        {loadingPaket ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Search className="size-4" aria-hidden="true" />
                        )}
                        Cari
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Data paket diambil langsung dari layanan Sipedal — pilih tipe (Tender,
                  Nontender, atau e-Katalog), masukkan kode, lalu tekan Cari atau Enter.
                </p>
              </div>

              {pesanPaket && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {pesanPaket}
                </p>
              )}

              {paket && (
                <div className="overflow-hidden rounded-lg border border-status-verified/30">
                  <p className="label-caps flex items-center gap-1.5 border-b border-status-verified/20 bg-status-verified/10 px-3 py-2 text-status-verified">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    Paket Ditemukan
                  </p>
                  <div className="bg-card p-3">
                    <p className="text-sm font-semibold leading-snug" title={paket.nama}>
                      {paket.nama}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="label-caps text-muted-foreground">Kode</span>
                        <span className="rounded border border-border bg-surface-subtle px-1.5 py-0.5 font-mono font-semibold text-primary">
                          {paket.kode}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="label-caps text-muted-foreground">Tahun</span>
                        <span className="font-medium tabular-nums">{paket.tahun}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="label-caps text-muted-foreground">Jenis</span>
                        <span className="font-medium">{labelJenis(paket.jenisPengadaan)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="label-caps text-muted-foreground">Metode</span>
                        <span className="font-medium">{labelMetode(paket.metodePengadaan)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Langkah 2 — penerima akses: grup &/atau perorangan */}
            {paket && (
              <section className="space-y-3">
                <Langkah
                  n="2"
                  judul="Penerima Akses (opsional, pilih grup dan/atau perorangan)"
                  keterangan="Penerima dapat melihat, mengunduh, dan melengkapi berkas paket."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Grup — pilih satu (opsional) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pbj-grup">Grup</Label>
                    <Select
                      items={[
                        { value: "__tanpa", label: "— Tanpa grup —" },
                        ...grups.map((g) => ({ value: g.id, label: g.nama })),
                      ]}
                      value={grupId || "__tanpa"}
                      onValueChange={(v) => setGrupId((v as string) === "__tanpa" ? "" : (v as string))}
                    >
                      <SelectTrigger id="pbj-grup" className="w-full" aria-label="Grup tujuan">
                        <SelectValue placeholder="Pilih grup" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__tanpa">— Tanpa grup —</SelectItem>
                        {grups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Perorangan — multi-pilih dengan pencarian */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="pbj-penerima">Perorangan</Label>
                      <span className="text-xs text-muted-foreground tabular-nums" role="status">
                        Terpilih: {penerimaIds.length}
                      </span>
                    </div>
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="pbj-penerima"
                        type="search"
                        value={cariUser}
                        onChange={(e) => setCariUser(e.target.value)}
                        placeholder="Cari nama/email…"
                        className="pl-8"
                      />
                    </div>
                    <DaftarPenerima
                      pengguna={pengguna}
                      terpilih={penerimaIds}
                      onToggle={(id) =>
                        setPenerimaIds((p) =>
                          p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
                        )
                      }
                      kata={cariUser.trim().toLowerCase()}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Langkah 3 — daftar dokumen */}
            {paket && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <Langkah
                    n="3"
                    judul="Pilih Berkas per Jenis Dokumen"
                    keterangan={`${fileTerpilih.length} dari ${baris.length} dokumen siap diunggah`}
                  />
                </div>

                {baris.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    Belum ada jenis dokumen yang dipetakan untuk jenis &amp; metode paket ini.
                    Hubungi admin taksonomi.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {baris.map((b, i) => (
                      <BarisDokumen
                        key={b.docId}
                        nomor={i + 1}
                        baris={b}
                        onPilih={(f) => setFile(b.docId, f)}
                        registerRef={(el) => {
                          inputRefs.current[b.docId] = el;
                        }}
                      />
                    ))}
                  </ul>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="keterangan">Keterangan (opsional)</Label>
                  <Textarea
                    id="keterangan"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    rows={2}
                    placeholder="Berlaku untuk semua dokumen yang diunggah pada proses ini."
                  />
                </div>
              </section>
            )}
          </div>

          {/* Footer tetap */}
          <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t border-border bg-surface-subtle/50 px-6 py-3 sm:justify-between">
            <div className="min-w-0 flex-1 text-sm">
              {error && <p className="text-destructive">{error}</p>}
              {pesanSukses && <p className="text-status-verified">{pesanSukses}</p>}
              {!error && !pesanSukses && (
                <p className="text-muted-foreground">
                  {paket
                    ? `${fileTerpilih.length} berkas dipilih · maks 25 MB per berkas`
                    : "Cari paket terlebih dahulu untuk melihat daftar dokumen."}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Batal
              </Button>
              <Button type="submit" disabled={!bisaSimpan}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="size-4" aria-hidden="true" />
                )}
                {pending
                  ? "Mengunggah..."
                  : `Unggah ${fileTerpilih.length > 0 ? `${fileTerpilih.length} Dokumen` : ""}`}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Langkah({
  n,
  judul,
  keterangan,
}: {
  n: string;
  judul: string;
  keterangan?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
      >
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{judul}</p>
        {keterangan && <p className="text-xs text-muted-foreground">{keterangan}</p>}
      </div>
    </div>
  );
}

function BarisDokumen({
  nomor,
  baris,
  onPilih,
  registerRef,
}: {
  nomor: number;
  baris: Baris;
  onPilih: (f: File | null) => void;
  registerRef: (el: HTMLInputElement | null) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const terisi = Boolean(baris.file);

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        terisi ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-6 shrink-0 items-center justify-center rounded text-xs font-semibold tabular-nums ${
          terisi ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {terisi ? <CheckCircle2 className="size-3.5" /> : nomor}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={baris.nama}>
          {baris.nama}
        </p>
        <p className="truncate text-xs text-muted-foreground" title={baris.file?.name ?? undefined}>
          {baris.file ? `${baris.file.name} · ${fmtSize(baris.file.size)}` : "Belum ada berkas"}
        </p>
      </div>

      <input
        ref={(el) => {
          ref.current = el;
          registerRef(el);
        }}
        type="file"
        className="hidden"
        aria-label={`Berkas untuk ${baris.nama}`}
        onChange={(e) => onPilih(e.target.files?.[0] ?? null)}
      />

      {terisi ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => {
            onPilih(null);
            if (ref.current) ref.current.value = "";
          }}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Hapus
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => ref.current?.click()}
        >
          <FileUp className="size-4" aria-hidden="true" />
          Pilih Berkas
        </Button>
      )}
    </li>
  );
}

/**
 * Daftar perorangan penerima share: Pejabat Pengadaan diurut paling atas,
 * sisanya mengikuti abjad; difilter lewat kata kunci pencarian.
 */
function DaftarPenerima({
  pengguna,
  terpilih,
  onToggle,
  kata,
}: {
  pengguna: { id: string; nama: string; email: string; role: string }[];
  terpilih: string[];
  onToggle: (id: string) => void;
  kata: string;
}) {
  const urut = useMemo(() => {
    const prioritas = (r: string) => (r === "PEJABAT_FUNGSIONAL" ? 0 : 1);
    return [...pengguna].sort(
      (a, b) => prioritas(a.role) - prioritas(b.role) || a.nama.localeCompare(b.nama)
    );
  }, [pengguna]);

  const tampil = kata
    ? urut.filter(
        (u) => u.nama.toLowerCase().includes(kata) || u.email.toLowerCase().includes(kata)
      )
    : urut;

  return (
    <div
      className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2"
      role="group"
      aria-label="Daftar perorangan penerima"
    >
      {pengguna.length === 0 ? (
        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
          Belum ada pengguna aktif.
        </p>
      ) : tampil.length === 0 ? (
        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
          Tidak ada yang cocok dengan “{kata}”.
        </p>
      ) : (
        tampil.map((u) => {
          const aktif = terpilih.includes(u.id);
          return (
            <label
              key={u.id}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                aktif ? "bg-primary/5" : "hover:bg-muted/60"
              }`}
            >
              <input
                type="checkbox"
                checked={aktif}
                onChange={() => onToggle(u.id)}
                className="size-4 shrink-0 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium leading-tight">{u.nama}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {u.role === "PEJABAT_FUNGSIONAL" ? "Pejabat Pengadaan" : u.email}
                </span>
              </span>
              {aktif && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
            </label>
          );
        })
      )}
    </div>
  );
}
