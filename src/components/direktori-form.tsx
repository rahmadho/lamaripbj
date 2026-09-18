"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createDirektori, updateDirektori } from "@/server/actions/direktori";
import { Check, FolderPlus, Info, Upload } from "lucide-react";

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "PIMPINAN", label: "Pimpinan" },
  { value: "PEJABAT_FUNGSIONAL", label: "Pejabat Fungsional" },
  { value: "STAFF", label: "Staff" },
  { value: "UPLOADER", label: "Uploader" },
];

/** Pembatas antar blok isian — garis rambut tipis, bukan kartu di dalam kartu. */
function Pembatas() {
  return <div className="h-px bg-border" aria-hidden="true" />;
}

export function DirektoriForm({
  mode = "create",
  parentId,
  initial,
  trigger,
}: {
  mode?: "create" | "edit";
  parentId?: string | null;
  initial?: {
    id: string;
    nama: string;
    deskripsi: string | null;
    bolehUpload: boolean;
    uploadRoles: string[];
  };
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [deskripsi, setDeskripsi] = useState(initial?.deskripsi ?? "");
  const [bolehUpload, setBolehUpload] = useState(initial?.bolehUpload ?? true);
  const [uploadRoles, setUploadRoles] = useState<string[]>(initial?.uploadRoles ?? []);

  const ubah = mode === "edit";

  function toggleRole(r: string) {
    setUploadRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      nama,
      deskripsi,
      parentId: parentId ?? null,
      bolehUpload,
      uploadRoles,
    };
    start(async () => {
      const res =
        ubah && initial
          ? await updateDirektori(initial.id, payload)
          : await createDirektori(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      if (!ubah) {
        setNama("");
        setDeskripsi("");
      }
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement}>{null}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <span
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/8 text-primary"
              aria-hidden="true"
            >
              <FolderPlus className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>{ubah ? "Ubah Direktori" : "Direktori Baru"}</DialogTitle>
              <DialogDescription className="mt-1">
                {ubah
                  ? "Perbarui nama, deskripsi, dan izin upload direktori ini."
                  : "Buat folder penyimpanan arsip pegawai, lalu bagikan setelah tersimpan."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {/* Identitas direktori */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Direktori</Label>
              <Input
                id="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="mis. SK Kenaikan Pangkat"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">
                Deskripsi
                <span className="font-normal text-muted-foreground">opsional</span>
              </Label>
              <Textarea
                id="deskripsi"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Keterangan singkat isi direktori ini"
                rows={3}
              />
            </div>
          </div>

          <Pembatas />

          {/* Izin berkas — well tunggal yang mengembang saat upload aktif */}
          <div className="overflow-hidden rounded-lg border border-border bg-surface-subtle/40">
            <label
              htmlFor="bolehUpload"
              className="flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:bg-surface-subtle/70"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  bolehUpload
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
                aria-hidden="true"
              >
                <Upload className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">
                  Terima berkas di direktori ini
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  Nonaktifkan bila folder hanya untuk penyimpanan.
                </span>
              </span>
              <span
                role="switch"
                aria-checked={bolehUpload}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                  bolehUpload ? "border-primary bg-primary" : "border-input bg-card"
                }`}
              >
                <span
                  className={`absolute size-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                    bolehUpload ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </span>
              <input
                id="bolehUpload"
                type="checkbox"
                checked={bolehUpload}
                onChange={(e) => setBolehUpload(e.target.checked)}
                className="sr-only"
              />
            </label>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                bolehUpload ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
              aria-hidden={!bolehUpload}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border px-3.5 pb-3.5 pt-3">
                  <fieldset className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <legend
                        id="label-upload-roles"
                        className="label-caps text-muted-foreground"
                      >
                        Batasi ke Role
                      </legend>
                      {uploadRoles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setUploadRoles([])}
                          className="text-xs font-medium text-primary underline-offset-3 hover:underline"
                        >
                          Bersihkan
                        </button>
                      )}
                    </div>
                    <div
                      className="flex flex-wrap gap-1.5"
                      role="group"
                      aria-labelledby="label-upload-roles"
                    >
                      {ROLES.map((r) => {
                        const aktif = uploadRoles.includes(r.value);
                        return (
                          <button
                            key={r.value}
                            type="button"
                            aria-pressed={aktif}
                            onClick={() => toggleRole(r.value)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              aktif
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            }`}
                          >
                            {aktif && (
                              <Check className="size-3" aria-hidden="true" strokeWidth={3} />
                            )}
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                      <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {uploadRoles.length === 0
                          ? "Tanpa batasan — siapa pun yang punya izin upload dapat mengunggah."
                          : `Hanya role terpilih yang dapat mengunggah (${
                              uploadRoles.length
                            } role).`}
                      </span>
                    </p>
                  </fieldset>
                </div>
              </div>
            </div>
          </div>

          {!ubah && (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-px size-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Direktori baru hanya terlihat oleh Anda dan admin. Bagikan lewat menu{" "}
                <span className="font-medium text-foreground">Bagikan</span> setelah tersimpan.
              </span>
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : ubah ? "Simpan Perubahan" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
