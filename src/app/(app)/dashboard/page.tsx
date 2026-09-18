import Link from "next/link";
import { auth } from "@/lib/auth";
import { getStatistikDashboard } from "@/server/queries/laporan";
import { DashboardStats } from "@/components/dashboard-stats";
import { PageHeader } from "@/components/page-header";
import { FolderTree, Boxes, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;
  const stats = await getStatistikDashboard();

  const modul = [
    {
      href: "/arsip-pegawai",
      ikon: FolderTree,
      judul: "Arsip Pegawai",
      deskripsi: "Kelola arsip pegawai dalam struktur direktori bertingkat.",
    },
    {
      href: "/arsip-pbj",
      ikon: Boxes,
      judul: "Arsip PBJ",
      deskripsi: "Kelola dokumen pengadaan barang/jasa per paket.",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        label="Ruang Kerja Arsip"
        judul={`Selamat datang, ${session.user.name}`}
        deskripsi={`Anda masuk sebagai ${session.user.role}. Pilih modul atau tinjau ringkasan di bawah.`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {modul.map((m, i) => {
          const I = m.ikon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="group elev-1 animate-rise flex items-center justify-between rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/40 hover:elev-2"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <I className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold tracking-tight">{m.judul}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{m.deskripsi}</p>
                </div>
              </div>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>

      <DashboardStats stats={stats} />
    </div>
  );
}
