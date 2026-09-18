import Link from "next/link";
import { auth } from "@/lib/auth";
import { cariArsip } from "@/server/queries/cari";
import { Badge } from "@/components/ui/badge";
import { CariInput } from "@/components/cari-input";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Search } from "lucide-react";

export default async function CariPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  const { q } = await searchParams;
  const hasil = q ? await cariArsip(session, q) : { arsipPegawai: [], arsipPbj: [] };
  const total = hasil.arsipPegawai.length + hasil.arsipPbj.length;

  return (
    <div className="space-y-6">
      <PageHeader
        label="Telusur"
        judul="Pencarian"
        deskripsi="Cari arsip pegawai dan PBJ berdasarkan nomor, nama, paket, atau keterangan."
      />

      <CariInput defaultValue={q ?? ""} />

      {q && (
        <p className="text-sm text-muted-foreground">
          {total} hasil untuk &quot;{q}&quot;
        </p>
      )}

      {hasil.arsipPegawai.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium">Arsip Pegawai</h2>
          <ul className="space-y-2">
            {hasil.arsipPegawai.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{a.nomorDokumen}</Badge>
                <Link
                  href={`/arsip-pegawai/${a.direktoriId}`}
                  className="text-primary hover:underline"
                >
                  {a.namaDokumen}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {a.direktoriNama} ·{" "}
                  {new Date(a.tanggal).toLocaleDateString("id-ID")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasil.arsipPbj.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium">Arsip PBJ</h2>
          <ul className="space-y-2">
            {hasil.arsipPbj.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{a.paketKode}</Badge>
                <Link href={`/arsip-pbj/${a.id}`} className="text-primary hover:underline">
                  {a.paketNama}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {a.jenisDoc} · {a.tahun}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {q && total === 0 && (
        <EmptyState
          ikon={<Search className="size-5" aria-hidden="true" />}
          judul={`Tidak ada hasil untuk "${q}"`}
          deskripsi="Coba kata kunci lain, misalnya nomor dokumen, kode paket, atau nama paket."
        />
      )}
    </div>
  );
}
