"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createGrup, updateGrup, deleteGrup } from "@/server/actions/grup";
import { Check, Search, X } from "lucide-react";

type Kandidat = { id: string; nama: string; username: string; email: string | null };

export function GrupForm({
  mode = "create",
  initial,
  kandidat,
}: {
  mode?: "create" | "edit";
  initial?: { id: string; nama: string; anggotaIds: string[] };
  kandidat: Kandidat[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [anggota, setAnggota] = useState<string[]>(initial?.anggotaIds ?? []);
  const [cari, setCari] = useState("");

  function toggle(id: string) {
    setAnggota((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  // Anggota lama yang sudah tidak ada di daftar kandidat (mis. dinonaktifkan)
  // tetap dipertahankan di `anggota` agar tidak hilang diam-diam saat menyimpan;
  // mereka tampil sebagai chip "(tidak tersedia)" yang tetap bisa dihapus.
  const kandidatMap = new Map(kandidat.map((k) => [k.id, k]));

  const kata = cari.trim().toLowerCase();
  const tampil = kata
    ? kandidat.filter(
        (k) =>
          k.nama.toLowerCase().includes(kata) ||
          k.username.toLowerCase().includes(kata) ||
          (k.email?.toLowerCase().includes(kata) ?? false)
      )
    : kandidat;

  function pilihTampil() {
    setAnggota((p) => [...new Set([...p, ...tampil.map((k) => k.id)])]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const payload = { nama, anggotaIds: anggota };
      const res =
        mode === "edit" && initial
          ? await updateGrup(initial.id, payload)
          : await createGrup(payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      if (mode === "create") {
        setNama("");
        setAnggota([]);
      }
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={mode === "edit" ? "outline" : "default"} />}>
        {mode === "edit" ? "Ubah" : "+ Grup Baru"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Ubah Grup" : "Grup Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="namaGrup">Nama Grup</Label>
            <Input
              id="namaGrup"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Label id="label-anggota-grup">Anggota (Pejabat Fungsional)</Label>
              <p
                className="text-xs text-muted-foreground tabular-nums"
                role="status"
                aria-live="polite"
              >
                {anggota.length} dipilih
              </p>
            </div>

            {anggota.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Anggota terpilih">
                {anggota.map((id) => {
                  const k = kandidatMap.get(id);
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 py-0.5 pl-2.5 pr-1 text-xs"
                    >
                      <span className="max-w-40 truncate">{k?.nama ?? "(tidak tersedia)"}</span>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        aria-label={`Hapus ${k?.nama ?? id} dari anggota`}
                        className="flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {kandidat.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada user dengan role Pejabat Fungsional.
              </p>
            ) : (
              <>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    value={cari}
                    onChange={(e) => setCari(e.target.value)}
                    placeholder="Cari nama, username, atau email…"
                    aria-label="Cari calon anggota"
                    className="pl-8"
                  />
                </div>
                {tampil.length > 1 && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {tampil.length} dari {kandidat.length} orang
                    </p>
                    <button
                      type="button"
                      onClick={pilihTampil}
                      className="text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Pilih yang tampil
                    </button>
                  </div>
                )}
                <div
                  className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2"
                  role="group"
                  aria-labelledby="label-anggota-grup"
                >
                  {tampil.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Tidak ada yang cocok dengan “{cari.trim()}”.
                    </p>
                  ) : (
                    tampil.map((k) => {
                      const aktif = anggota.includes(k.id);
                      return (
                        <label
                          key={k.id}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus-within:ring-2 focus-within:ring-ring ${
                            aktif ? "bg-primary/5" : "hover:bg-muted/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={aktif}
                            onChange={() => toggle(k.id)}
                            className="size-4 shrink-0 accent-primary"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium leading-tight">{k.nama}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              @{k.username}
                              {k.email ? ` · ${k.email}` : ""}
                            </span>
                          </span>
                          {aktif && (
                            <Check
                              className="size-4 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
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

export function HapusGrupButton({ id, nama }: { id: string; nama: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-sm text-destructive hover:underline"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Hapus grup "${nama}"?`)) return;
        start(async () => {
          await deleteGrup(id);
          router.refresh();
        });
      }}
    >
      {pending ? "Menghapus..." : "Hapus"}
    </button>
  );
}
