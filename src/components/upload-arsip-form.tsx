"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createArsipPegawai } from "@/server/actions/arsip-pegawai";
import { isMimeAllowed, MAX_FILE_SIZE } from "@/lib/storage/aturan";
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  Hash,
  Info,
  Loader2,
  RotateCcw,
  Signature,
  Upload,
} from "lucide-react";

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** Pembatas antar-blok isian — garis rambut tipis, bukan kartu di dalam kartu. */
function Pembatas() {
  return <div className="h-px bg-border" aria-hidden="true" />;
}

export function UploadArsipForm({ direktoriId }: { direktoriId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0); // reset form tanpa setState-di-effect
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [seret, setSeret] = useState(false);
  const [galatBerkas, setGalatBerkas] = useState<string | null>(null);

  function pilihBerkas(f: File | null | undefined) {
    setError(null);
    if (!f) {
      setBerkas(null);
      setGalatBerkas(null);
      return;
    }
    if (!isMimeAllowed(f.type)) {
      setBerkas(null);
      setGalatBerkas(`Tipe berkas tidak diizinkan. Gunakan PDF, gambar, atau Office.`);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setBerkas(null);
      setGalatBerkas(`Ukuran ${fmtSize(f.size)} melebihi batas 25 MB.`);
      return;
    }
    setGalatBerkas(null);
    setBerkas(f);
  }

  function bersihkanBerkas() {
    setBerkas(null);
    setGalatBerkas(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!berkas) {
      setGalatBerkas("Berkas belum dipilih.");
      return;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("direktoriId", direktoriId);
    fd.set("file", berkas);
    setError(null);
    start(async () => {
      const res = await createArsipPegawai(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      bersihkanBerkas();
      setResetKey((k) => k + 1);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ Unggah Arsip</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <span
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/8 text-primary"
              aria-hidden="true"
            >
              <Signature className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>Unggah Arsip Pegawai</DialogTitle>
              <DialogDescription className="mt-1">
                Lengkapi metadata dokumen, lalu lampirkan satu berkas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form key={resetKey} onSubmit={submit} className="space-y-5">
          {/* Data dokumen */}
          <div className="space-y-4">
            <p className="label-caps text-muted-foreground">Data Dokumen</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nomorDokumen" className="gap-1.5">
                  <Hash className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  Nomor Dokumen
                </Label>
                <Input
                  id="nomorDokumen"
                  name="nomorDokumen"
                  required
                  autoFocus
                  placeholder="mis. 800/123/2026"
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal" className="gap-1.5">
                  <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  Tanggal
                </Label>
                <Input id="tanggal" name="tanggal" type="date" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="namaDokumen" className="gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />
                Nama Dokumen
              </Label>
              <Input
                id="namaDokumen"
                name="namaDokumen"
                required
                placeholder="mis. SK Kenaikan Pangkat"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Dipakai sebagai bagian nama berkas saat diunduh.
              </p>
            </div>
          </div>

          <Pembatas />

          {/* Berkas */}
          <div className="space-y-2">
            <p className="label-caps text-muted-foreground">Berkas</p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setSeret(true);
              }}
              onDragLeave={() => setSeret(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSeret(false);
                pilihBerkas(e.dataTransfer.files?.[0]);
              }}
              className={`relative rounded-lg border border-dashed transition-colors ${
                galatBerkas
                  ? "border-destructive/50 bg-destructive/5"
                  : seret
                    ? "border-primary bg-primary/5"
                    : berkas
                      ? "border-border bg-surface-subtle/40"
                      : "border-input bg-surface-subtle/40 hover:border-primary/40"
              }`}
            >
              {berkas ? (
                <div className="flex items-center gap-3 p-3.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/8 text-primary"
                    aria-hidden="true"
                  >
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{berkas.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {fmtSize(berkas.size)} · {berkas.type || "tipe tidak dikenal"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={bersihkanBerkas}
                    aria-label="Ganti berkas"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="file"
                  className="flex cursor-pointer flex-col items-center gap-2 px-4 py-7 text-center"
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-md border border-primary/20 bg-primary/8 text-primary"
                    aria-hidden="true"
                  >
                    <Upload className="size-[18px]" />
                  </span>
                  <span className="text-sm font-medium">
                    Seret berkas ke sini, atau{" "}
                    <span className="text-primary underline underline-offset-2">pilih berkas</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, gambar, atau Office · maks 25 MB
                  </span>
                </label>
              )}
              <input
                ref={inputRef}
                id="file"
                name="file"
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => pilihBerkas(e.target.files?.[0])}
              />
            </div>

            {galatBerkas && (
              <p
                role="alert"
                className="flex items-start gap-1.5 text-xs leading-relaxed text-destructive"
              >
                <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                <span>{galatBerkas}</span>
              </p>
            )}
          </div>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Arsip tersimpan privat — hanya Anda dan admin. Bagikan lewat menu{" "}
              <span className="font-medium text-foreground">Bagikan</span> bila perlu diakses orang
              lain.
            </span>
          </p>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending || !berkas}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {pending ? "Mengunggah..." : "Unggah Arsip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
