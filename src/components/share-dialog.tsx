"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { shareSubjek } from "@/server/actions/arsip-pegawai";
import { Input } from "@/components/ui/input";
import { IZIN, IZIN_LABEL, levelDariIzin, type Izin } from "@/lib/izin";
import { AlertCircle, Check, Search, TriangleAlert } from "lucide-react";

const ROLES = [
  { value: "PIMPINAN", label: "Pimpinan" },
  { value: "PEJABAT_FUNGSIONAL", label: "Pejabat Fungsional" },
  { value: "STAFF", label: "Staff" },
  { value: "UPLOADER", label: "Uploader" },
];

const LEVELS = [
  { value: "VIEW", label: "Lihat", deskripsi: "Buka dokumen saja" },
  { value: "DOWNLOAD", label: "Lihat & Unduh", deskripsi: "Buka dan unduh berkas" },
] as const;

const TARGETS = [
  {
    value: "role",
    label: "Role",
    deskripsi: "Grup jabatan",
  },
  {
    value: "user",
    label: "Perorangan",
    deskripsi: "Satu pengguna",
  },
  {
    value: "grup",
    label: "Grup",
    deskripsi: "Khusus arsip PBJ",
  },
  {
    value: "semua",
    label: "Semua Pengguna",
    deskripsi: "Publik internal",
  },
] as const;

type TargetType = (typeof TARGETS)[number]["value"];

export function ShareDialog({
  subjek,
  users,
  grups,
  trigger,
}: {
  subjek: { direktoriId?: string; arsipPegawaiId?: string; arsipPbjId?: string };
  users: { id: string; nama: string; username?: string; email?: string | null }[];
  grups: { id: string; nama: string }[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);
  const [level, setLevel] = useState<"VIEW" | "DOWNLOAD">("VIEW");
  const [izinDipilih, setIzinDipilih] = useState<Izin[]>(["VIEW"]);
  const [targetType, setTargetType] = useState<TargetType>(subjek.arsipPbjId ? "grup" : "role");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [grupIds, setGrupIds] = useState<string[]>([]);
  const [cari, setCari] = useState("");

  const isPbj = !!subjek.arsipPbjId;
  // PBJ: Grup + Perorangan bisa dipilih BERSAMAAN (multi-pilih lintas jenis);
  // non-PBJ: pilih satu jenis penerima saja (user/role/semuaUser).
  const targets = isPbj
    ? TARGETS.filter((t) => t.value === "grup" || t.value === "user")
    : TARGETS.filter((t) => t.value !== "grup");

  // jumlah penerima terpilih untuk tipe aktif
  const jumlahTerpilih =
    targetType === "user"
      ? userIds.length
      : targetType === "role"
        ? roleIds.length
        : targetType === "grup"
          ? grupIds.length
          : 0;

  function gantiTipe(t: TargetType) {
    setTargetType(t);
    setUserIds([]);
    setRoleIds([]);
    setGrupIds([]);
    setCari("");
    setError(null);
  }

  function toggleDari<T>(setter: (fn: (p: T[]) => T[]) => void, nilai: T) {
    setter((p) => (p.includes(nilai) ? p.filter((x) => x !== nilai) : [...p, nilai]));
    setError(null);
  }

  function toggleIzin(i: Izin) {
    setIzinDipilih((p) => {
      if (p.includes(i)) {
        // VIEW tidak boleh dilepas (dasar akses)
        if (i === "VIEW") return p;
        return p.filter((x) => x !== i);
      }
      return [...p, i];
    });
    setError(null);
  }

  const kata = cari.trim().toLowerCase();
  const userTampil = kata
    ? users.filter(
        (u) =>
          u.nama.toLowerCase().includes(kata) ||
          (u.username?.toLowerCase().includes(kata) ?? false) ||
          (u.email?.toLowerCase().includes(kata) ?? false)
      )
    : users;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = { ...subjek };

    if (isPbj) {
      // PBJ: kirim grupIds + userIds sekaligus (boleh campur, minimal satu)
      if (grupIds.length === 0 && userIds.length === 0) {
        setError("Pilih minimal satu grup atau perorangan.");
        return;
      }
      payload.level = level;
      if (grupIds.length > 0) payload.grupIds = grupIds;
      if (userIds.length > 0) payload.userIds = userIds;
    } else {
      if (targetType !== "semua" && jumlahTerpilih === 0) {
        setError("Pilih minimal satu penerima terlebih dahulu.");
        return;
      }
      payload.izin = izinDipilih;
      payload.level = levelDariIzin(izinDipilih);
      if (targetType === "user") payload.userIds = userIds;
      else if (targetType === "role") payload.roles = roleIds;
      else if (targetType === "grup") payload.grupIds = grupIds;
      else payload.semuaUser = true;
    }

    start(async () => {
      const res = await shareSubjek(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      setSukses(true);
      setUserIds([]);
      setRoleIds([]);
      setGrupIds([]);
      setIzinDipilih(["VIEW"]);
      router.refresh();
      setTimeout(() => setSukses(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement}>{null}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bagikan Akses</DialogTitle>
          <DialogDescription>
            Pilih satu atau beberapa penerima, lalu tentukan tingkat aksesnya.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {/* Level akses (hanya arsip PBJ: VIEW/DOWNLOAD) */}
          {isPbj && (
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
                      className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
          )}

          {/* Izin granular (direktori & arsip pegawai) */}
          {!isPbj && (
            <fieldset className="space-y-2">
              <legend className="label-caps text-muted-foreground">Hak Akses (boleh beberapa)</legend>
              <div role="group" aria-label="Pilihan hak akses" className="space-y-1.5">
                {IZIN.map((i) => {
                  const meta = IZIN_LABEL[i];
                  const aktif = izinDipilih.includes(i);
                  const terkunci = i === "VIEW"; // dasar akses, selalu aktif
                  return (
                    <label
                      key={i}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors ${
                        aktif
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-card hover:bg-muted/50"
                      } ${meta.bahaya ? "border-l-2" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={aktif}
                        disabled={terkunci}
                        onChange={() => toggleIzin(i)}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {meta.label}
                          {terkunci && (
                            <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                              (selalu aktif)
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">{meta.deskripsi}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {izinDipilih.includes("DELETE") && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive"
                >
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <strong>Hati-hati:</strong> izin Delete memungkinkan penerima menghapus arsip dan
                    subdirektori secara permanen. Berikan hanya kepada orang yang benar-benar
                    dipercaya.
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Subdirektori dapat punya aturan sendiri: bila subfolder dibagikan terpisah, izin di
                sini tidak berlaku ke dalamnya.
              </p>
            </fieldset>
          )}

          {/* Target */}
          <fieldset className="space-y-2">
            <legend className="label-caps text-muted-foreground">
              {isPbj ? "Bagikan Ke Grup &/atau Perorangan" : "Bagikan Ke"}
            </legend>
            {isPbj ? (
              <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                Arsip pengadaan dapat dibagikan ke <span className="font-medium text-foreground">grup</span>,{" "}
                <span className="font-medium text-foreground">perorangan</span>, atau keduanya
                sekaligus. Kelola anggota grup di menu Grup.
              </p>
            ) : (
              <div
                role="radiogroup"
                aria-label="Jenis penerima"
                className={`grid gap-2 ${targets.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {targets.map(({ value, label, deskripsi }) => {
                  const aktif = targetType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={aktif}
                      onClick={() => gantiTipe(value)}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
            )}
          </fieldset>

          {isPbj && (
            <PanelGrup grups={grups} grupIds={grupIds} toggle={(id) => toggleDari(setGrupIds, id)} />
          )}
          {isPbj && (
            <PanelUser
              cari={cari}
              setCari={setCari}
              userTampil={userTampil}
              users={users}
              userIds={userIds}
              toggleUser={(id) => toggleDari(setUserIds, id)}
            />
          )}

          {!isPbj && targetType === "semua" && (
            <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Akses akan diberikan ke{" "}
              <span className="font-medium text-foreground">seluruh pengguna aktif</span> tanpa
              terkecuali. Gunakan hanya untuk direktori yang memang untuk seluruh kantor.
            </p>
          )}
          {!isPbj && targetType === "user" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="share-target">Pilih pengguna</Label>
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
                  id="share-target"
                  type="search"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari nama, username, atau email…"
                  aria-label="Cari pengguna"
                  className="pl-8"
                />
              </div>
              <div
                className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2"
                role="group"
                aria-label="Daftar pengguna"
              >
                {users.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Belum ada pengguna aktif.
                  </p>
                ) : userTampil.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">
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
                          onChange={() => toggleDari(setUserIds, u.id)}
                          className="size-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium leading-tight">{u.nama}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {u.username ? `@${u.username}` : u.email ?? "Pejabat Pengadaan"}
                          </span>
                        </span>
                        {aktif && (
                          <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}
          {!isPbj && targetType === "role" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p id="share-target-role" className="text-sm font-medium leading-none">
                  Pilih role
                </p>
                <span className="text-xs text-muted-foreground tabular-nums" role="status">
                  Terpilih: {roleIds.length}
                </span>
              </div>
              <div
                role="group"
                aria-labelledby="share-target-role"
                className="grid gap-2 sm:grid-cols-2"
              >
                {ROLES.map((r) => {
                  const aktif = roleIds.includes(r.value);
                  return (
                    <label
                      key={r.value}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                        aktif
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={aktif}
                        onChange={() => toggleDari(setRoleIds, r.value)}
                        className="size-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 truncate font-medium">{r.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
                Berhasil dibagikan
              </span>
            )}
            <Button type="submit" disabled={pending}>
              {pending
                ? "Menyimpan..."
                : jumlahTerpilih > 1
                  ? `Bagikan ke ${jumlahTerpilih} penerima`
                  : "Bagikan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Panel penerima untuk arsip PBJ (grup + perorangan berdampingan) ── */

function PanelGrup({
  grups,
  grupIds,
  toggle,
}: {
  grups: { id: string; nama: string }[];
  grupIds: string[];
  toggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p id="pbj-share-grup" className="text-sm font-medium leading-none">
          Grup
        </p>
        <span className="text-xs text-muted-foreground tabular-nums" role="status">
          Terpilih: {grupIds.length}
        </span>
      </div>
      <div
        className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2"
        role="group"
        aria-labelledby="pbj-share-grup"
      >
        {grups.length === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">
            Belum ada grup. Buat grup di menu Grup.
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
                  onChange={() => toggle(g.id)}
                  className="size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{g.nama}</span>
                {aktif && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function PanelUser({
  cari,
  setCari,
  userTampil,
  users,
  userIds,
  toggleUser,
}: {
  cari: string;
  setCari: (v: string) => void;
  userTampil: { id: string; nama: string; username?: string; email?: string | null }[];
  users: { id: string; nama: string; username?: string; email?: string | null }[];
  userIds: string[];
  toggleUser: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p id="pbj-share-user" className="text-sm font-medium leading-none">
          Perorangan
        </p>
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
          id="pbj-share-user-cari"
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama, username, atau email…"
          aria-label="Cari pengguna"
          className="pl-8"
        />
      </div>
      <div
        className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2"
        role="group"
        aria-labelledby="pbj-share-user"
      >
        {users.length === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">
            Belum ada pengguna aktif.
          </p>
        ) : userTampil.length === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">
            Tidak ada yang cocok dengan “{cari.trim()}”.
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
                  onChange={() => toggleUser(u.id)}
                  className="size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium leading-tight">{u.nama}</span>
                  <span className="block truncate text-xs text-muted-foreground">{u.username ? `@${u.username}` : u.email ?? "Pejabat Pengadaan"}</span>
                </span>
                {aktif && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
