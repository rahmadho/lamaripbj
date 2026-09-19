import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/share-dialog";
import { EditShareDialog } from "@/components/edit-share-dialog";
import { HapusButton } from "@/components/hapus-button";
import { CabutShareButton } from "@/components/cabut-share-button";
import { getArsipPbj } from "@/server/queries/arsip-pbj";
import { canAccessArsipPbj } from "@/lib/acl";
import { labelJenis, labelMetode } from "@/lib/pbj";
import { Download, Boxes, ChevronRight, FileText, CalendarDays, Pencil } from "lucide-react";

export default async function DetailArsipPbjPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const allowed = await canAccessArsipPbj(session, id, "VIEW");
  if (!allowed) notFound();

  const [arsip, users, grups] = await Promise.all([
    getArsipPbj(id),
    prisma.user.findMany({
      where: { aktif: true, role: "PEJABAT_FUNGSIONAL" },
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    }),
    prisma.grup.findMany({ select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
  ]);
  if (!arsip) notFound();

  const isOwner = arsip.createdById === session.user.id || session.user.role === "ADMIN";
  const bisaUnduh = await canAccessArsipPbj(session, id, "DOWNLOAD");

  const jenis = labelJenis(arsip.jenisPengadaan);
  const metode = labelMetode(arsip.metodePengadaan);

  return (
    <div className="space-y-5">
      <nav
        className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link href="/arsip-pbj" className="shrink-0 hover:text-foreground">
          Arsip PBJ
        </Link>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate font-mono text-xs text-foreground/70">{arsip.paketKode}</span>
      </nav>

      {/* Kop dossier */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary/40"
        />
        <div className="flex flex-col gap-4 py-4 pl-5 pr-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-2">
            <p className="label-caps inline-flex items-center gap-1.5 text-primary">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              Dokumen Pengadaan
            </p>
            <h1
              className="font-heading text-xl font-bold leading-tight tracking-tight sm:text-2xl"
              title={arsip.paketNama}
            >
              {arsip.paketNama}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-border bg-surface-subtle px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                {arsip.paketKode}
              </span>
              <span className="text-xs text-muted-foreground">Diunggah oleh {arsip.createdBy.nama}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {bisaUnduh && (
              <Button
                size="sm"
                nativeButton={false}
                render={
                  <a href={`/api/files/${arsip.fileId}?dl=1`} target="_blank" rel="noreferrer" />
                }
              >
                <Download className="size-4" aria-hidden="true" />
                Unduh Dokumen
              </Button>
            )}
            {isOwner && (
              <>
                <ShareDialog
                  subjek={{ arsipPbjId: arsip.id }}
                  users={users}
                  grups={grups}
                  trigger={
                    <Button size="sm" variant="outline">
                      Bagikan
                    </Button>
                  }
                />
                <HapusButton
                  jenis="arsip"
                  id={arsip.id}
                  redirectTo="/arsip-pbj"
                  label="Hapus"
                  deskripsi="Arsip pengadaan ini akan dihapus permanen."
                />
              </>
            )}
          </div>
        </div>

        {/* Band taksonomi */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/70 bg-surface-subtle/40 px-5 py-2.5">
          <MetaChip ikon={<Boxes className="size-3.5" aria-hidden="true" />} label="Jenis">
            {jenis}
          </MetaChip>
          <MetaChip ikon={<LandmarkIcon />} label="Metode">
            {metode}
          </MetaChip>
          <MetaChip ikon={<CalendarDays className="size-3.5" aria-hidden="true" />} label="Tahun">
            <span className="tabular-nums">{arsip.tahun}</span>
          </MetaChip>
        </div>
      </section>

      {/* Register metadata */}
      <section className="elev-1 overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border/70 bg-surface-subtle/60 px-4 py-2.5">
          <FileText className="size-3.5 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight">Metadata Berkas</h2>
        </header>
        <dl className="grid grid-cols-1 gap-x-8 px-5 sm:grid-cols-2">
          <Field label="Kode Paket" value={arsip.paketKode} mono />
          <Field label="Nama Paket" value={arsip.paketNama} />
          <Field label="Jenis Pengadaan" value={jenis} />
          <Field label="Metode Pengadaan" value={metode} />
          <Field label="Jenis Dokumen" value={arsip.taksonomiJenisDoc.nama} />
          <Field label="Tahun Anggaran" value={String(arsip.tahun)} />
          <Field label="Diunggah Oleh" value={arsip.createdBy.nama} />
          <Field
            label="Tanggal Unggah"
            value={arsip.createdAt.toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          />
          <Field label="Nama Berkas" value={arsip.file.fileName} className="sm:col-span-2" />
          <Field
            label="Keterangan"
            value={arsip.keterangan?.trim() ? arsip.keterangan : "—"}
            className="sm:col-span-2"
          />
        </dl>
      </section>

      {arsip.shares.length > 0 && isOwner && (
        <details className="elev-1 group/share overflow-hidden rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-subtle/50 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <UsersIcon />
              Dibagikan kepada{" "}
              <span className="font-semibold text-foreground">{arsip.shares.length} penerima</span>
            </span>
            <span className="label-caps text-primary opacity-0 transition-opacity group-open/share:opacity-100">
              Tutup
            </span>
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {arsip.shares.map((s) => {
              const nama = s.semuaUser
                ? "Semua Pengguna"
                : (s.user?.nama ?? s.grup?.nama ?? s.role ?? "-");
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate" title={nama}>
                    {nama}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={s.level === "DOWNLOAD" ? "verified" : "ghost"}>
                      {s.level === "DOWNLOAD" ? "Lihat & Unduh" : "Lihat"}
                    </Badge>
                    <CabutShareButton id={s.id} nama={nama} />
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border bg-surface-subtle/40 px-4 py-2.5">
            <EditShareDialog
              arsipPbjId={arsip.id}
              shares={arsip.shares}
              users={users}
              grups={grups}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="size-4" aria-hidden="true" />
                  Ubah Penerima
                </Button>
              }
            />
          </div>
        </details>
      )}
    </div>
  );
}

function MetaChip({
  ikon,
  label,
  children,
}: {
  ikon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span aria-hidden="true" className="text-muted-foreground/70">
        {ikon}
      </span>
      <span className="label-caps text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </span>
  );
}

function LandmarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="M3 22h18" />
      <path d="M6 18v-7" />
      <path d="M10 18v-7" />
      <path d="M14 18v-7" />
      <path d="M18 18v-7" />
      <path d="M12 2 3 8h18z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 border-b border-border/60 py-3 ${className ?? ""}`}>
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd
        className={`mt-0.5 break-words ${mono ? "font-mono text-sm font-medium" : "text-sm font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}
