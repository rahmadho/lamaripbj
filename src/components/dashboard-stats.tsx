"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderTree,
  Boxes,
  Users,
  Layers,
  Download,
  Activity,
} from "lucide-react";

function Bar({ label, jumlah, max }: { label: string; jumlah: number; max: number }) {
  const pct = max > 0 ? Math.round((jumlah / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{jumlah}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardStats({
  stats,
}: {
  stats: {
    totalArsipPegawai: number;
    totalArsipPbj: number;
    totalDirektori: number;
    totalUser: number;
    totalGrup: number;
    perJenis: { label: string; jumlah: number }[];
    perMetode: { label: string; jumlah: number }[];
    perTahun: { label: string; jumlah: number }[];
    perBulanPegawai: { label: string; jumlah: number }[];
    auditTerbaru: {
      id: string;
      aksi: string;
      entitas: string;
      createdAt: Date;
      user: { nama: string } | null;
    }[];
  };
}) {
  const maxJenis = Math.max(1, ...stats.perJenis.map((r) => r.jumlah));
  const maxMetode = Math.max(1, ...stats.perMetode.map((r) => r.jumlah));
  const maxBulan = Math.max(1, ...stats.perBulanPegawai.map((r) => r.jumlah));

  // Baris utama: 2 metrik besar + 3 metrik pendukung
  const utama = [
    {
      label: "Arsip Pegawai",
      nilai: stats.totalArsipPegawai,
      ikon: FolderTree,
      aksen: "text-primary",
    },
    {
      label: "Arsip PBJ",
      nilai: stats.totalArsipPbj,
      ikon: Boxes,
      aksen: "text-[var(--status-info)]",
    },
  ];
  const pendukung = [
    { label: "Direktori", nilai: stats.totalDirektori, ikon: Layers },
    { label: "Pengguna Aktif", nilai: stats.totalUser, ikon: Users },
    { label: "Grup", nilai: stats.totalGrup, ikon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Panel metrik utama */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {utama.map((k, i) => {
            const I = k.ikon;
            return (
              <Card
                key={k.label}
                className="animate-rise"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="flex items-start justify-between pt-1">
                  <div>
                    <p className="label-caps text-muted-foreground">{k.label}</p>
                    <p className="mt-2 font-heading text-4xl font-bold tabular-nums tracking-tight">
                      {k.nilai}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      dokumen terarsip
                    </p>
                  </div>
                  <div
                    className={`flex size-10 items-center justify-center rounded-md bg-muted ${k.aksen}`}
                  >
                    <I className="size-5" aria-hidden="true" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="animate-rise" style={{ animationDelay: "120ms" }}>
          <CardHeader className="pb-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground label-caps">
              Ringkasan Sistem
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border pt-2">
            {pendukung.map((k) => {
              const I = k.ikon;
              return (
                <div key={k.label} className="flex items-center gap-3 py-2.5">
                  <I className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-sm text-muted-foreground">{k.label}</span>
                  <span className="tabular-nums font-heading font-semibold">{k.nilai}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Aksi cepat */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="label-caps mr-1 text-muted-foreground">Ekspor</span>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<a href="/api/export?jenis=pegawai" />}
        >
          <Download className="size-3.5" aria-hidden="true" />
          Arsip Pegawai (CSV)
        </Button>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<a href="/api/export?jenis=pbj" />}
        >
          <Download className="size-3.5" aria-hidden="true" />
          Arsip PBJ (CSV)
        </Button>
      </div>

      {/* Distribusi */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">PBJ per Jenis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.perJenis.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada data</p>
            ) : (
              stats.perJenis.map((r) => (
                <Bar key={r.label} label={r.label} jumlah={r.jumlah} max={maxJenis} />
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">PBJ per Metode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.perMetode.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada data</p>
            ) : (
              stats.perMetode.map((r) => (
                <Bar key={r.label} label={r.label} jumlah={r.jumlah} max={maxMetode} />
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Arsip Pegawai per Bulan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.perBulanPegawai.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada data</p>
            ) : (
              stats.perBulanPegawai.map((r) => (
                <Bar key={r.label} label={r.label} jumlah={r.jumlah} max={maxBulan} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log aktivitas — register padat */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 pb-2">
          <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-sm">Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.auditTerbaru.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada aktivitas</p>
          ) : (
            <ul className="-my-1 divide-y divide-border">
              {stats.auditTerbaru.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className="font-medium">{a.user?.nama ?? "-"}</span>
                  <Badge variant="info">{a.aksi}</Badge>
                  <span className="text-xs text-muted-foreground">{a.entitas}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
