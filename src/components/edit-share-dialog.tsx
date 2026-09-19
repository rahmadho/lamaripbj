"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateSharePbj } from "@/server/actions/arsip-pegawai";
import { AlertCircle, Check, Loader2, Pencil, Search } from "lucide-react";

type Share = {
  id: string;
  level: string;
  userId: string | null;
  grupId: string | null;
  user?: { nama: string } | null;
  grup?: { nama: string } | null;
};

const LEVELS = [
  { value: "VIEW", label: "Lihat", deskripsi: "Hanya dapat melihat dokumen" },
  { value: "DOWNLOAD", label: "Lihat & Unduh", deskripsi: "Melihat dan mengunduh berkas" },
] as const;

/**
 * Dialog ubah share arsip PBJ: sinkronisasi penuh grup + perorangan.
 * Penerima yang dicentang dipertahankan/ditambah, yang tidak dicentang dicabut.
 */
export function EditShareDialog({
  arsipPbjId,
  shares,
  users,
  grups,
  trigger,
}: {
  arsipPbjId: string;
  shares: Share[];
  users: { id: string; nama: string }[];
  grups: { id: string; nama: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement}>{null}</DialogTrigger>
      {open && (
        <IsiForm
          arsipPbjId={arsipPbjId}
          shares={shares}
          users={users}
          grups={grups}
          tutup={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}

/** Isi form — dirender hanya saat dialog terbuka, sehingga state terinisialisasi dari share terkini tanpa effect. */
function IsiForm({
  arsipPbjId,
  shares,
  users,
  grups,
  tutup,
}: {
  arsipPbjId: string;
  shares: Share[];
  users: { id: string; nama: string }[];
  grups: { id: string; nama: string }[];
  tutup: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  // inisialisasi langsung dari share yang ada (bukan via effect)
  const awal = useMemo(() => {
    const g: string[] = [];
    const u: string[] = [];
    let lvl: "VIEW" | "DOWNLOAD" = "VIEW";
    for (const s of shares) {
      if (s.grupId) g.push(s.grupId);
      if (s.userId) u.push(s.userId);
      if (s.level === "DOWNLOAD") lvl = "DOWNLOAD";
    }
    return { g, u, lvl };
  }, [shares]);

  const [level, setLevel] = useState<"VIEW" | "DOWNLOAD">(awal.lvl);
  const [grupIds, setGrupIds] = useState<string[]>(awal.g);
  const [userIds, setUserIds] = useState<string[]>(awal.u);
  const [cari, setCari] = useState("");

  const kata = cari.trim().toLowerCase();
  const userTampil = useMemo(
    () => (kata ? users.filter((x) => x.nama.toLowerCase().includes(kata)) : users),
    [users, kata]
  );

  const total = grupIds.length + userIds.length;

  function toggle(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    id: string
  ) {
    setter((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (total === 0) {
      setError("Pilih minimal satu penerima — atau hapus semua via tombol cabut per baris.");
      return;
    }
    start(async () => {
      const res = await updateSharePbj({
        arsipPbjId,
        level,
        grupIds,
        userIds,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSukses(true);
      setTimeout(() => {
        setSukses(false);
        tutup();
      }, 1200);
    });
  }

  return (
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ubah Penerima Akses</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Centang penerima yang dipertahankan/ditambahkan; hilangkan centang untuk mencabut
            aksesnya. Perubahan berlaku untuk semua penerima sekaligus.
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="label-caps text-muted-foreground">Level Akses</legend>
            <div role="radiogroup" aria-label="Level akses" className="grid grid-cols-2 gap-2">
              {LEVELS.map(({ value, label, deskripsi }) => {
                const aktif = level === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => setLevel(value)}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      aktif
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs">{deskripsi}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="label-caps text-muted-foreground">Grup</legend>
            <div
              className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2"
              role="group"
              aria-label="Daftar grup"
            >
              {grups.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                  Belum ada grup.
                </p>
              ) : (
                grups.map((g) => {
                  const aktif = grupIds.includes(g.id);
                  return (
                    <label
                      key={g.id}
                      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                        aktif ? "bg-primary/5" : "hover:bg-muted/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={aktif}
                        onChange={() => toggle(setGrupIds, g.id)}
                        className="size-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{g.nama}</span>
                      {aktif && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                    </label>
                  );
                })
              )}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <legend className="label-caps text-muted-foreground">Perorangan</legend>
              <span className="text-xs text-muted-foreground tabular-nums" role="status">
                Terpilih: {userIds.length}
              </span>
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama…"
                aria-label="Cari pengguna"
                className="pl-8"
              />
            </div>
            <div
              className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2"
              role="group"
              aria-label="Daftar perorangan"
            >
              {users.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                  Belum ada pengguna aktif.
                </p>
              ) : userTampil.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                  Tidak ada yang cocok dengan “{kata}”.
                </p>
              ) : (
                userTampil.map((u) => {
                  const aktif = userIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                        aktif ? "bg-primary/5" : "hover:bg-muted/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={aktif}
                        onChange={() => toggle(setUserIds, u.id)}
                        className="size-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium leading-tight">{u.nama}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          Pejabat Pengadaan
                        </span>
                      </span>
                      {aktif && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                    </label>
                  );
                })
              )}
            </div>
          </fieldset>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="items-center">
            {sukses && (
              <span className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-status-verified">
                <Check className="size-4" aria-hidden="true" />
                Penerima diperbarui
              </span>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Pencil className="size-4" aria-hidden="true" />
              )}
              {pending ? "Menyimpan..." : `Simpan (${total} penerima)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
  );
}
