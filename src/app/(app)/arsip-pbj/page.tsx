import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { UploadArsipPbjForm } from "@/components/upload-arsip-pbj-form";
import { PbjFilter, PaketList, Pagination } from "@/components/pbj-list";
import { getDaftarPaketPbj, getTahunTersedia } from "@/server/queries/arsip-pbj";
import { labelJenis, labelMetode } from "@/lib/pbj";
import type { JenisPengadaan } from "@prisma/client";
import { Boxes, FileStack, Landmark } from "lucide-react";

export default async function ArsipPbjPage({
  searchParams,
}: {
  searchParams: Promise<{
    jenis?: string;
    metode?: string;
    tahun?: string;
    kode?: string;
    nama?: string;
    hal?: string;
  }>;
}) {
  const session = await auth();
  if (!session) return null;
  const sp = await searchParams;

  const [hasil, tahunOptions] = await Promise.all([
    getDaftarPaketPbj(session, {
      jenisPengadaan: (sp.jenis as JenisPengadaan) || undefined,
      metodePengadaan: sp.metode || undefined,
      tahun: sp.tahun ? Number(sp.tahun) : undefined,
      kodePaket: sp.kode || undefined,
      namaPaket: sp.nama || undefined,
      halaman: sp.hal ? Number(sp.hal) : 1,
      perHalaman: 15,
    }),
    getTahunTersedia(),
  ]);
  const paket = hasil.data;

  const adaFilter = Boolean(sp.jenis || sp.metode || sp.tahun || sp.kode || sp.nama);
  const jenisUnik = new Set(paket.map((p) => p.jenisPengadaan)).size;
  const totalDokumen = paket.reduce((acc, p) => acc + p.dokumen.length, 0);

  return (
    <div className="space-y-5">
      {/* Kop register */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary/40"
        />
        <div className="flex flex-col gap-4 py-4 pl-5 pr-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1.5">
            <p className="label-caps inline-flex items-center gap-1.5 text-primary">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              Modul Arsip
            </p>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Arsip Pengadaan</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Register dokumen pengadaan barang/jasa per paket, terklasifikasi menurut jenis dan
              metode pengadaan serta jenis dokumen.
            </p>
          </div>
          <div className="shrink-0">
            <UploadArsipPbjForm />
          </div>
        </div>

        <dl className="grid grid-cols-1 divide-y divide-border/70 border-t border-border/70 bg-surface-subtle/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat
            ikon={<FileStack className="size-3.5" aria-hidden="true" />}
            label={adaFilter ? "Paket (terfilter)" : "Total Paket"}
            nilai={String(paket.length)}
          />
          <Stat
            ikon={<Boxes className="size-3.5" aria-hidden="true" />}
            label="Jenis Pengadaan"
            nilai={String(jenisUnik)}
          />
          <Stat
            ikon={<Landmark className="size-3.5" aria-hidden="true" />}
            label="Dokumen Terkait"
            nilai={String(totalDokumen)}
          />
        </dl>
      </section>

      <Suspense>
        <PbjFilter tahunOptions={tahunOptions} />
      </Suspense>

      <PaketList
        adaFilter={adaFilter}
        data={paket.map((p) => ({
          ...p,
          jenisPengadaan: labelJenis(p.jenisPengadaan),
          metodePengadaan: labelMetode(p.metodePengadaan),
        }))}
      />

      <Pagination
        halaman={hasil.halaman}
        totalHalaman={hasil.totalHalaman}
        total={hasil.total}
        perHalaman={hasil.perHalaman}
      />
    </div>
  );
}

function Stat({
  ikon,
  label,
  nilai,
}: {
  ikon: React.ReactNode;
  label: string;
  nilai: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary"
      >
        {ikon}
      </span>
      <div className="min-w-0">
        <dt className="label-caps text-muted-foreground">{label}</dt>
        <dd className="font-heading text-lg font-semibold tabular-nums leading-tight">{nilai}</dd>
      </div>
    </div>
  );
}
