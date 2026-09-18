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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createDirektori, updateDirektori } from "@/server/actions/direktori";

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "PIMPINAN", label: "Pimpinan" },
  { value: "PEJABAT_FUNGSIONAL", label: "Pejabat Fungsional" },
  { value: "STAFF", label: "Staff" },
  { value: "UPLOADER", label: "Uploader" },
];

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
        mode === "edit" && initial
          ? await updateDirektori(initial.id, payload)
          : await createDirektori(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      if (mode === "create") {
        setNama("");
        setDeskripsi("");
      }
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement}>{null}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Ubah Direktori" : "Direktori Baru"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Direktori</Label>
            <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deskripsi">Deskripsi</Label>
            <Textarea
              id="deskripsi"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={3}
            />
          </div>
          <div className="rounded-lg border border-border bg-surface-subtle/40 p-3">
            <label
              htmlFor="bolehUpload"
              className="flex cursor-pointer items-center justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-tight">
                  Izinkan upload di direktori ini
                </span>
                <span className="block text-xs text-muted-foreground">
                  Nonaktifkan bila folder ini hanya untuk penyimpanan, bukan penerimaan berkas.
                </span>
              </span>
              <input
                id="bolehUpload"
                type="checkbox"
                checked={bolehUpload}
                onChange={(e) => setBolehUpload(e.target.checked)}
                className="size-4 shrink-0 accent-primary"
              />
            </label>
          </div>
          {bolehUpload && (
            <fieldset className="space-y-2">
              <legend id="label-upload-roles" className="label-caps text-muted-foreground">
                Batasi Upload ke Role
              </legend>
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
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        aktif
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Kosong = hanya Anda (pemilik) dan admin yang dapat mengunggah; pengguna lain perlu
                di-share dengan izin Upload.
              </p>
            </fieldset>
          )}
          <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Direktori baru hanya terlihat oleh Anda dan admin. Agar pengguna lain dapat mengakses,
            bagikan setelah dibuat — perorangan, role, grup, atau centang &quot;Semua Pengguna&quot; untuk
            berbagi ke seluruh kantor.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
