"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { SlotKosong } from "@/components/slot-kosong";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSearch,
  FileText,
  FolderOpen,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { JENIS_PENGADAAN, METODE_PENGADAAN } from "@/lib/pbj";

export type PbjRow = {
  id: string;
  paketKode: string;
  paketNama: string;
  jenisPengadaan: string;
  metodePengadaan: string;
  tahun: number;
  jenisDoc: string;
  createdBy: string;
};

type FilterKey = { key: string; label: string; value: string };

export function PbjFilter({ tahunOptions }: { tahunOptions: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "__all") next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  function reset() {
    router.push(pathname);
  }

  const aktif: FilterKey[] = [];
  const jenisP = params.get("jenis");
  const metodeP = params.get("metode");
  const tahunP = params.get("tahun");
  const kodeP = params.get("kode");
  const namaP = params.get("nama");
  if (jenisP)
    aktif.push({
      key: "jenis",
      label: "Jenis",
      value: JENIS_PENGADAAN.find((j) => j.value === jenisP)?.label ?? jenisP,
    });
  if (metodeP)
    aktif.push({
      key: "metode",
      label: "Metode",
      value: METODE_PENGADAAN.find((m) => m.value === metodeP)?.label ?? metodeP,
    });
  if (tahunP) aktif.push({ key: "tahun", label: "Tahun", value: tahunP });
  if (kodeP) aktif.push({ key: "kode", label: "Kode", value: kodeP });
  if (namaP) aktif.push({ key: "nama", label: "Nama", value: namaP });

  return (
    <section
      className="elev-1 overflow-hidden rounded-xl border border-border bg-card"
      aria-label="Filter arsip pengadaan"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-surface-subtle/60 px-4 py-2.5">
        <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
          <SlidersHorizontal className="size-3.5 text-primary" aria-hidden="true" />
          Filter Register
        </p>
        {aktif.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
            Bersihkan ({aktif.length})
          </Button>
        )}
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <FilterField label="Jenis Pengadaan" id="f-jenis">
          <Select
            items={[{ value: "__all", label: "Semua jenis" }, ...JENIS_PENGADAAN]}
            value={params.get("jenis") ?? "__all"}
            onValueChange={(v) => setParam("jenis", v as string)}
          >
            <SelectTrigger id="f-jenis" className="w-full" aria-label="Filter jenis pengadaan">
              <SelectValue placeholder="Semua jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Semua jenis</SelectItem>
              {JENIS_PENGADAAN.map((j) => (
                <SelectItem key={j.value} value={j.value}>
                  {j.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Metode Pengadaan" id="f-metode">
          <Select
            items={[{ value: "__all", label: "Semua metode" }, ...METODE_PENGADAAN]}
            value={params.get("metode") ?? "__all"}
            onValueChange={(v) => setParam("metode", v as string)}
          >
            <SelectTrigger id="f-metode" className="w-full" aria-label="Filter metode pengadaan">
              <SelectValue placeholder="Semua metode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Semua metode</SelectItem>
              {METODE_PENGADAAN.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Tahun Anggaran" id="f-tahun">
          <Select
            items={[
              { value: "__all", label: "Semua tahun" },
              ...tahunOptions.map((t) => ({ value: String(t), label: String(t) })),
            ]}
            value={params.get("tahun") ?? "__all"}
            onValueChange={(v) => setParam("tahun", v as string)}
          >
            <SelectTrigger id="f-tahun" className="w-full" aria-label="Filter tahun anggaran">
              <SelectValue placeholder="Semua tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Semua tahun</SelectItem>
              {tahunOptions.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Nama Paket" id="f-nama" hint="Enter">
          <Input
            id="f-nama"
            defaultValue={namaP ?? ""}
            placeholder="cari nama paket..."
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("nama", (e.target as HTMLInputElement).value);
            }}
          />
        </FilterField>

        <FilterField label="Kode Paket" id="f-kode" hint="Enter">
          <Input
            id="f-kode"
            defaultValue={kodeP ?? ""}
            placeholder="mis. PKT-2026"
            className="font-mono text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("kode", (e.target as HTMLInputElement).value);
            }}
          />
        </FilterField>
      </div>

      {aktif.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/70 bg-surface-subtle/40 px-4 py-2.5">
          <span className="label-caps text-muted-foreground">Aktif</span>
          {aktif.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setParam(f.key, "__all")}
              className="group/chip inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Hapus filter ${f.label}: ${f.value}`}
            >
              <span className="text-primary/60">{f.label}</span>
              <span className="max-w-[10rem] truncate">{f.value}</span>
              <X className="size-3 opacity-60 group-hover/chip:opacity-100" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function FilterField({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="label-caps text-muted-foreground">
          {label}
        </label>
        {hint && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export type PaketRow = {
  id: string;
  paketKode: string;
  paketNama: string;
  jenisPengadaan: string;
  metodePengadaan: string;
  tahun: number;
  grup: { id: string; nama: string } | null;
  createdBy: string;
  terakhirDiubah: Date;
  dokumen: {
    id: string;
    jenisDocId: string;
    jenisDoc: string;
    fileName: string;
    createdBy: string;
    createdAt: Date;
    penerima: { nama: string; jenis: string; level: string }[];
  }[];
  slotKosong: { taksonomiJenisDocId: string; nama: string }[];
};

/** Daftar arsip terkelompok per paket; tiap kartu bisa di-expand menampilkan dokumennya. */
export function PaketList({ data, adaFilter = false }: { data: PaketRow[]; adaFilter?: boolean }) {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());

  function toggle(kunci: string) {
    setTerbuka((prev) => {
      const next = new Set(prev);
      if (next.has(kunci)) next.delete(kunci);
      else next.add(kunci);
      return next;
    });
  }

  if (data.length === 0) {
    return (
      <div className="elev-1 overflow-hidden rounded-xl border border-border bg-card">
        <EmptyState
          ikon={<FileSearch className="size-5" aria-hidden="true" />}
          judul={adaFilter ? "Tidak ada paket sesuai filter" : "Register pengadaan masih kosong"}
          deskripsi={
            adaFilter
              ? "Ubah atau bersihkan filter untuk menampilkan paket lain pada register."
              : "Unggah dokumen pengadaan pertama Anda untuk mulai membangun register."
          }
        />
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((p) => {
        const kunci = `${p.paketKode}|${p.tahun}`;
        const buka = terbuka.has(kunci);
        const n = p.dokumen.length;
        return (
          <li
            key={kunci}
            className="elev-1 min-w-0 overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* Kepala paket — selalu terlihat */}
            <button
              type="button"
              onClick={() => toggle(kunci)}
              aria-expanded={buka}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-subtle/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  buka
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/20 bg-primary/8 text-primary"
                }`}
              >
                <FolderOpen className="size-4" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span
                    className="font-mono text-xs font-semibold text-primary"
                  >
                    {p.paketKode}
                  </span>
                  <span
                    className="truncate text-sm font-semibold leading-snug tracking-tight"
                    title={p.paketNama}
                  >
                    {p.paketNama}
                  </span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">{p.jenisPengadaan}</span>
                  <span aria-hidden="true">·</span>
                  <span>{p.metodePengadaan}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{p.tahun}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="size-3" aria-hidden="true" />
                    {n} dokumen
                  </span>
                  {p.slotKosong.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-status-pending">
                        {p.slotKosong.length} belum lengkap
                      </span>
                    </>
                  )}
                </span>
              </span>

              <ChevronDown
                aria-hidden="true"
                className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  buka ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Daftar dokumen dalam paket + slot yang belum diunggah */}
            {buka && (
              <ul className="divide-y divide-border/70 border-t border-border/70 bg-surface-subtle/30">
                {p.dokumen.map((d) => (
                  <li key={d.id} className="group/doc flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="truncate text-sm font-medium" title={d.jenisDoc}>
                          {d.jenisDoc}
                        </span>
                        <span
                          className="truncate text-xs text-muted-foreground"
                          title={d.fileName}
                        >
                          {d.fileName}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        Diunggah {d.createdBy} ·{" "}
                        {d.createdAt.toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {d.penerima.length > 0 && (
                        <span
                          className="mt-1 flex flex-wrap items-center gap-1"
                          title={`Dibagikan ke: ${d.penerima.map((x) => x.nama).join(", ")}`}
                        >
                          <Users className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                          {d.penerima.map((x) => (
                            <span
                              key={x.nama}
                              className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              {x.jenis === "grup" && (
                                <Users className="size-2.5" aria-hidden="true" />
                              )}
                              {x.nama}
                              {x.level === "DOWNLOAD" && (
                                <Download className="size-2.5 text-status-verified" aria-hidden="true" />
                              )}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                    <Link
                      href={`/arsip-pbj/${d.id}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded text-xs font-semibold text-primary opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group-hover/doc:opacity-100"
                    >
                      Buka
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
                {p.slotKosong.map((s) => (
                  <SlotKosong
                    key={s.taksonomiJenisDocId}
                    paketId={p.id}
                    docId={s.taksonomiJenisDocId}
                    nama={s.nama}
                  />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Kontrol halaman server-side via searchParams `?hal=`. */
export function Pagination({
  halaman,
  totalHalaman,
  total,
  perHalaman,
}: {
  halaman: number;
  totalHalaman: number;
  total: number;
  perHalaman: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (totalHalaman <= 1) {
    return (
      <p className="text-center text-xs text-muted-foreground" role="status">
        {total} paket
      </p>
    );
  }

  function ke(h: number) {
    const next = new URLSearchParams(params.toString());
    next.set("hal", String(h));
    router.push(`${pathname}?${next.toString()}`);
  }

  const awal = (halaman - 1) * perHalaman + 1;
  const akhir = Math.min(halaman * perHalaman, total);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3"
      aria-label="Navigasi halaman"
    >
      <p className="text-xs text-muted-foreground tabular-nums" role="status">
        Menampilkan {awal}–{akhir} dari {total} paket
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={halaman <= 1}
          onClick={() => ke(halaman - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Sebelumnya
        </Button>
        <span className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
          Hal. {halaman} / {totalHalaman}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={halaman >= totalHalaman}
          onClick={() => ke(halaman + 1)}
          aria-label="Halaman berikutnya"
        >
          Berikutnya
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
