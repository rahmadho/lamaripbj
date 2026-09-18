import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDibagikanKeSaya } from "@/server/queries/admin";
import { izinRingkas } from "@/lib/izin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { FolderOpen, Inbox } from "lucide-react";

export default async function DibagikanPage() {
  const session = await auth();
  if (!session) return null;
  const data = await getDibagikanKeSaya(session);

  return (
    <div className="space-y-8">
      <PageHeader
        label="Telusur"
        judul="Dibagikan kepada Saya"
        deskripsi="Arsip dan direktori yang dapat Anda akses lewat share perorangan, role, atau grup."
      />

      <section>
        <h2 className="mb-2 font-medium">Arsip Pegawai</h2>
        {data.direktori.length === 0 && data.arsipPegawai.length === 0 ? (
          <EmptyState
            ikon={<FolderOpen className="size-5" aria-hidden="true" />}
            judul="Belum ada arsip pegawai dibagikan"
            deskripsi="Arsip yang dibagikan ke akun, role, atau grup Anda akan tampil di sini."
          />
        ) : (
          <ul className="space-y-2">
            {data.direktori.map((d) => (
              <li key={`dir-${d.id}`} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">Direktori</Badge>
                <Link href={`/arsip-pegawai/${d.id}`} className="text-primary hover:underline">
                  {d.nama}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {izinRingkas(d.izin, d.level)}
                </span>
              </li>
            ))}
            {data.arsipPegawai.map((a) => (
              <li key={`ap-${a.id}`} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">Arsip</Badge>
                <Link
                  href={`/arsip-pegawai/${a.direktori.id}`}
                  className="text-primary hover:underline"
                >
                  {a.nomorDokumen} — {a.namaDokumen}
                </Link>
                <span className="text-xs text-muted-foreground">
                  di {a.direktori.nama} · {izinRingkas(a.izin, a.level)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">Arsip PBJ</h2>
        {data.arsipPbj.length === 0 ? (
          <EmptyState
            ikon={<Inbox className="size-5" aria-hidden="true" />}
            judul="Belum ada arsip PBJ dibagikan"
            deskripsi="Dokumen pengadaan yang dibagikan ke akun, role, atau grup Anda akan tampil di sini."
          />
        ) : (
          <ul className="space-y-2">
            {data.arsipPbj.map((a) => (
              <li key={`pbj-${a.id}`} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{a.taksonomiJenisDoc.nama}</Badge>
                <Link href={`/arsip-pbj/${a.id}`} className="text-primary hover:underline">
                  {a.paketKode} — {a.paketNama}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {izinRingkas(a.izin, a.level)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
