import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FolderTree } from "@/components/folder-tree";
import { DirektoriForm } from "@/components/direktori-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { getDirektoriTree, getAnakDirektori } from "@/server/queries/direktori";
import Link from "next/link";
import { ChevronRight, Folder, FolderTree as FolderTreeIcon, Layers } from "lucide-react";

// Modul arsip pegawai tidak untuk UPLOADER (khusus Arsip PBJ)
const ROLES_ARSIP_PEGAWAI = ["ADMIN", "PIMPINAN", "PEJABAT_FUNGSIONAL", "STAFF"];

export default async function ArsipPegawaiPage() {
  const session = await auth();
  if (!session) return null;
  if (!ROLES_ARSIP_PEGAWAI.includes(session.user.role as string)) redirect("/tidak-berhak");
  const tree = await getDirektoriTree(session);
  const roots = await getAnakDirektori(session, null);
  const totalArsip = roots.reduce((n, d) => n + d._count.arsip, 0);
  const totalSub = roots.reduce((n, d) => n + d._count.children, 0);

  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
      {/* Rail struktur — dibatasi lebar & punya scroll sendiri agar tak mendorong konten */}
      <aside className="elev-1 h-fit min-w-0 rounded-lg border border-border bg-card md:sticky md:top-20">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Layers className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="label-caps text-muted-foreground">Struktur Direktori</p>
        </div>
        <div className="max-h-[calc(100dvh-8.5rem)] overflow-y-auto overscroll-contain p-2">
          <FolderTree nodes={tree} activeId={null} />
        </div>
      </aside>

      <section className="min-w-0 space-y-6">
        {/* Kop modul bergaya register — label, judul, deskripsi, aksi */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card elev-1">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1 bg-primary"
          />
          <div className="flex flex-wrap items-end justify-between gap-4 py-6 pl-6 pr-5 sm:pr-6">
            <div className="min-w-0 space-y-2">
              <p className="label-caps flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden="true" />
                Modul · Register Arsip Pegawai
              </p>
              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-[28px]">
                Arsip Pegawai
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                Susun dokumen kepegawaian dalam struktur direktori bertingkat, dengan kendali
                akses per direktori.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DirektoriForm trigger={<Button size="sm">Direktori Baru</Button>} />
            </div>
          </div>

          {/* Baris statistik ringkas — angka tabular, tanpa kartu bergradien */}
          {roots.length > 0 && (
            <dl className="grid grid-cols-3 divide-x divide-border border-t border-border bg-surface-subtle/60">
              <Stat label="Direktori Akar" value={roots.length} />
              <Stat label="Subdirektori" value={totalSub} />
              <Stat label="Arsip Terdaftar" value={totalArsip} />
            </dl>
          )}
        </div>

        {roots.length === 0 ? (
          <EmptyState
            ikon={<FolderTreeIcon className="size-5" aria-hidden="true" />}
            judul="Belum ada direktori"
            deskripsi="Buat direktori pertama untuk mulai menyusun arsip pegawai Anda."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card elev-1">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="label-caps text-muted-foreground">Indeks Direktori</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {roots.length} entri
              </p>
            </div>
            <ul className="divide-y divide-border">
              {roots.map((d, i) => (
                <li key={d.id}>
                  <Link
                    href={`/arsip-pegawai/${d.id}`}
                    className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <span className="hidden w-8 shrink-0 text-right font-heading text-xs font-semibold text-muted-foreground/70 tabular-nums sm:block">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-primary transition-colors duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <Folder className="size-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-heading text-[15px] font-semibold tracking-tight">
                        {d.nama}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                        <span>{d._count.children} subfolder</span>
                        <span className="text-border" aria-hidden="true">
                          ·
                        </span>
                        <span>{d._count.arsip} arsip</span>
                      </span>
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-5 py-3.5">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-xl font-bold tracking-tight tabular-nums">
        {value}
      </dd>
    </div>
  );
}
