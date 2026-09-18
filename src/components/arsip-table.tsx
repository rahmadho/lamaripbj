"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { Download, FileText, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ArsipRow = {
  id: string;
  nomorDokumen: string;
  namaDokumen: string;
  tanggal: string;
  fileId: string;
  fileName: string;
  createdBy: string;
};

export function ArsipTable({
  data,
  bolehUnduh = false,
}: {
  data: ArsipRow[];
  bolehUnduh?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (d) =>
        d.nomorDokumen.toLowerCase().includes(s) ||
        d.namaDokumen.toLowerCase().includes(s)
    );
  }, [q, data]);

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Cari nomor / nama dokumen..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
            aria-label="Cari arsip pegawai"
          />
        </div>
        {q.trim() && (
          <p className="text-xs text-muted-foreground tabular-nums" role="status">
            {filtered.length} dari {data.length} berkas
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          ikon={<FileText className="size-5" aria-hidden="true" />}
          judul={q.trim() ? "Tidak ada arsip yang cocok" : "Belum ada arsip di folder ini"}
          deskripsi={
            q.trim()
              ? "Coba kata kunci lain, atau kosongkan pencarian."
              : "Unggah dokumen ke folder ini untuk mulai mengarsipkan."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[9.5rem]">Nomor</TableHead>
              <TableHead>Nama Dokumen</TableHead>
              <TableHead className="hidden w-[8rem] sm:table-cell">Tanggal</TableHead>
              <TableHead className="hidden w-[11rem] md:table-cell">Diunggah Oleh</TableHead>
              <TableHead className="w-[13rem] text-right">Berkas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs font-medium tabular-nums">
                  {d.nomorDokumen}
                </TableCell>
                <TableCell>
                  <span className="block max-w-[22rem] truncate font-medium" title={d.namaDokumen}>
                    {d.namaDokumen}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums sm:hidden">
                    {d.tanggal}
                  </span>
                </TableCell>
                <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                  {d.tanggal}
                </TableCell>
                <TableCell className="hidden max-w-[11rem] truncate text-muted-foreground md:table-cell">
                  {d.createdBy}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    <a
                      href={`/api/files/${d.fileId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-[10rem] items-center gap-1.5 rounded px-1.5 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={`Buka pratinjau: ${d.fileName}`}
                    >
                      <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{d.fileName}</span>
                    </a>
                    {bolehUnduh && (
                      <a
                        href={`/api/files/${d.fileId}?dl=1`}
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Unduh berkas"
                        aria-label={`Unduh ${d.fileName}`}
                      >
                        <Download className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
