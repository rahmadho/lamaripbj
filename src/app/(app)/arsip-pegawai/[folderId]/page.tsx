import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderTree } from "@/components/folder-tree";
import { ChevronRight, FileText, Folder, FolderTree as FolderTreeIcon, Layers, Share2 } from "lucide-react";
import { DirektoriForm } from "@/components/direktori-form";
import { UploadArsipForm } from "@/components/upload-arsip-form";
import { ShareDialog } from "@/components/share-dialog";
import { ArsipTable } from "@/components/arsip-table";
import { HapusButton } from "@/components/hapus-button";
import { CabutShareButton } from "@/components/cabut-share-button";
import {
  getDirektoriTree,
  getDirektori,
  getBreadcrumb,
  getAnakDirektori,
  getArsipDiDirektori,
} from "@/server/queries/direktori";
import { canAccessDirektori } from "@/lib/acl";
import { canUploadTo } from "@/server/queries/direktori";
import { izinRingkas } from "@/lib/izin";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  const session = await auth();
  if (!session) return null;
  // UPLOADER tidak punya akses modul arsip pegawai
  if (!["ADMIN", "PIMPINAN", "PEJABAT_FUNGSIONAL", "STAFF"].includes(session.user.role as string)) {
    redirect("/tidak-berhak");
  }

  const allowed = await canAccessDirektori(session, folderId, "VIEW");
  if (!allowed) notFound();

  const [dir, tree, crumbs, children, arsip, izinUploadShare, bolehSubdir, bolehHapus, bolehUnduh, users, grups] =
    await Promise.all([
      getDirektori(folderId),
      getDirektoriTree(session),
      getBreadcrumb(folderId),
      getAnakDirektori(session, folderId),
      getArsipDiDirektori(folderId),
      canAccessDirektori(session, folderId, "UPLOAD"),
      canAccessDirektori(session, folderId, "CREATE_SUBDIR"),
      canAccessDirektori(session, folderId, "DELETE"),
      canAccessDirektori(session, folderId, "DOWNLOAD"),
      prisma.user.findMany({
        where: { aktif: true },
        select: { id: true, nama: true, username: true, email: true },
        orderBy: { nama: "asc" },
      }),
      prisma.grup.findMany({ select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
    ]);
  if (!dir) notFound();

  // tombol upload tampil jika izin share UPLOAD ATAU kebijakan bolehUpload direktori
  const izinUpload = izinUploadShare || (await canUploadTo(session, folderId));

  const isOwner = dir.ownerId === session.user.id || session.user.role === "ADMIN";

  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
      {/* Rail struktur — scroll mandiri, lebar tetap, tidak mendorong konten */}
      <aside className="elev-1 h-fit min-w-0 rounded-lg border border-border bg-card md:sticky md:top-20">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Layers className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="label-caps text-muted-foreground">Struktur Direktori</p>
        </div>
        <div className="max-h-[calc(100dvh-8.5rem)] overflow-y-auto overscroll-contain p-2">
          <FolderTree nodes={tree} activeId={folderId} />
        </div>
      </aside>

      <section className="min-w-0 space-y-6">
        {/* Jejak lokasi — nama panjang dipangkas agar tak memaksa lebar */}
        <nav
          className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
          aria-label="Jejak lokasi"
        >
          <Link
            href="/arsip-pegawai"
            className="shrink-0 rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Arsip Pegawai
          </Link>
          {crumbs.map((c, i) => (
            <span key={c.id} className="flex min-w-0 items-center gap-1.5">
              <ChevronRight className="size-3.5 shrink-0 text-border" aria-hidden="true" />
              <Link
                href={`/arsip-pegawai/${c.id}`}
                className={`max-w-[14rem] truncate rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  i === crumbs.length - 1 ? "font-medium text-foreground" : ""
                }`}
                aria-current={i === crumbs.length - 1 ? "page" : undefined}
                title={c.nama}
              >
                {c.nama}
              </Link>
            </span>
          ))}
        </nav>

        {/* Kop direktori — register record dengan metadata & aksi */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card elev-1">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary" />
          <div className="flex flex-wrap items-start justify-between gap-4 py-5 pl-6 pr-5 sm:pr-6">
            <div className="min-w-0 space-y-2">
              <p className="label-caps flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden="true" />
                Direktori
              </p>
              <h1 className="break-words font-heading text-2xl font-bold tracking-tight">
                {dir.nama}
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                {dir.deskripsi || "Tanpa deskripsi"}
              </p>
              <p className="text-xs text-muted-foreground">
                Dibuat oleh <span className="font-medium text-foreground">{dir.owner.nama}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {izinUpload && <UploadArsipForm direktoriId={folderId} />}
              {bolehSubdir && (
                <DirektoriForm
                  parentId={folderId}
                  trigger={
                    <Button size="sm" variant="outline">
                      Subfolder
                    </Button>
                  }
                />
              )}
              {isOwner && (
                <>
                  <DirektoriForm
                    mode="edit"
                    initial={{
                      id: dir.id,
                      nama: dir.nama,
                      deskripsi: dir.deskripsi,
                      bolehUpload: dir.bolehUpload,
                      uploadRoles: dir.uploadRoles,
                    }}
                    trigger={
                      <Button size="sm" variant="outline">
                        Pengaturan
                      </Button>
                    }
                  />
                  <ShareDialog
                    subjek={{ direktoriId: dir.id }}
                    users={users}
                    grups={grups}
                    trigger={
                      <Button size="sm" variant="outline">
                        Bagikan
                      </Button>
                    }
                  />
                </>
              )}
              {bolehHapus && (
                <HapusButton
                  jenis="direktori"
                  id={dir.id}
                  redirectTo="/arsip-pegawai"
                  deskripsi="Direktori beserta seluruh subfolder dan arsip di dalamnya akan dihapus permanen."
                />
              )}
            </div>
          </div>

          {/* Cap status & metadata — baris terpisah, bukan menumpuk di samping judul */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-subtle/60 px-6 py-3">
            <Badge variant={dir.bolehUpload ? "verified" : "secondary"}>
              {dir.bolehUpload ? "Upload diizinkan" : "Upload ditutup"}
            </Badge>
            {dir.uploadRoles.length > 0 && (
              <Badge variant="outline">Upload: {dir.uploadRoles.join(", ")}</Badge>
            )}
            <Badge variant="outline">{dir._count.children} subfolder</Badge>
            <Badge variant="outline">{dir._count.arsip} arsip</Badge>
            <span className="ml-auto hidden text-xs text-muted-foreground tabular-nums sm:block">
              Diubah {dir.updatedAt.toLocaleDateString("id-ID")}
            </span>
          </div>
        </div>

        {isOwner && dir.shares.length > 0 && (
          <details className="elev-1 group/share overflow-hidden rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Share2 className="size-4 shrink-0" aria-hidden="true" />
                Akses dibagikan ke {dir.shares.length} penerima
              </span>
              <span className="label-caps text-primary opacity-0 transition-opacity group-open/share:opacity-100">
                Tutup
              </span>
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {dir.shares.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {s.semuaUser ? "Semua Pengguna" : (s.user?.nama ?? s.grup?.nama ?? s.role ?? "-")}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={s.izin.length > 0 ? "info" : s.level === "DOWNLOAD" ? "verified" : "ghost"}>
                      {izinRingkas(s.izin, s.level)}
                    </Badge>
                    <CabutShareButton
                      id={s.id}
                      nama={
                        s.semuaUser
                          ? "Semua Pengguna"
                          : (s.user?.nama ?? s.grup?.nama ?? s.role ?? "-")
                      }
                    />
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {children.length > 0 && (
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <FolderTreeIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <p className="label-caps text-muted-foreground">Subdirektori</p>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {children.length} entri
              </span>
            </div>
            <ul className="elev-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {children.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/arsip-pegawai/${c.id}`}
                    className="group flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-primary transition-colors duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <Folder className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-heading text-sm font-semibold tracking-tight">
                        {c.nama}
                      </span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {c._count.children} subfolder · {c._count.arsip} arsip
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

        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <p className="label-caps text-muted-foreground">Arsip Dokumen</p>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {arsip.length} berkas
            </span>
          </div>
          <ArsipTable
            bolehUnduh={bolehUnduh}
            data={arsip.map((a) => ({
              id: a.id,
              nomorDokumen: a.nomorDokumen,
              namaDokumen: a.namaDokumen,
              tanggal: a.tanggal.toLocaleDateString("id-ID"),
              fileId: a.fileId,
              fileName: a.file.fileName,
              createdBy: a.createdBy.nama,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
