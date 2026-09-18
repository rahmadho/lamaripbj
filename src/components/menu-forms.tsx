"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createMenu, updateMenu, deleteMenu } from "@/server/actions/menu";

const ROLES = [
  ["ADMIN", "Admin"],
  ["PIMPINAN", "Pimpinan"],
  ["PEJABAT_FUNGSIONAL", "Pejabat Fungsional"],
  ["STAFF", "Staff"],
  ["UPLOADER", "Uploader"],
];

// Saran nama grup agar penulisan konsisten (input tetap bebas).
const GRUP_SARAN = ["Arsip", "Telusur", "Administrasi"];

type MenuItem = {
  id: string;
  key: string;
  label: string;
  path: string;
  grup: string | null;
  urutan: number;
  aktif: boolean;
  roles: string[];
};

export function MenuForm({
  mode = "create",
  initial,
}: {
  mode?: "create" | "edit";
  initial?: MenuItem;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    key: initial?.key ?? "",
    label: initial?.label ?? "",
    path: initial?.path ?? "",
    grup: initial?.grup ?? "",
    urutan: initial?.urutan ?? 0,
    aktif: initial?.aktif ?? true,
    roles: initial?.roles ?? [],
  });

  function toggleRole(r: string) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r],
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res =
        mode === "edit" && initial
          ? await updateMenu(initial.id, form)
          : await createMenu(form);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={mode === "edit" ? "outline" : "default"} />}>
        {mode === "edit" ? "Ubah" : "+ Menu Baru"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Ubah Menu" : "Menu Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="arsip-pegawai"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="path">Path</Label>
              <Input
                id="path"
                value={form.path}
                onChange={(e) => setForm({ ...form, path: e.target.value })}
                placeholder="/arsip-pegawai"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urutan">Urutan</Label>
              <Input
                id="urutan"
                type="number"
                value={form.urutan}
                onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="grup">Grup sidebar</Label>
              <Input
                id="grup"
                value={form.grup ?? ""}
                onChange={(e) => setForm({ ...form, grup: e.target.value })}
                placeholder="Arsip"
                list="daftar-grup-menu"
              />
              <datalist id="daftar-grup-menu">
                {GRUP_SARAN.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Kosongkan jika tidak ingin item ini dikelompokkan (tanpa heading).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="aktif"
              type="checkbox"
              checked={form.aktif}
              onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
            />
            <Label htmlFor="aktif">Aktif</Label>
          </div>
          <div className="space-y-2">
            <Label id="label-menu-roles">Terlihat untuk role (kosong = semua role)</Label>
            <div className="flex flex-wrap gap-3" role="group" aria-labelledby="label-menu-roles">
              {ROLES.map(([v, l]) => (
                <label key={v} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.roles.includes(v)}
                    onChange={() => toggleRole(v)}
                  />
                  {l}
                </label>
              ))}
            </div>
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

export function MenuRowActions({ item }: { item: MenuItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <Badge variant={item.aktif ? "default" : "secondary"}>
        {item.aktif ? "Aktif" : "Nonaktif"}
      </Badge>
      {item.grup && <Badge variant="info">{item.grup}</Badge>}
      <span className="text-xs text-muted-foreground">
        {item.roles.length ? item.roles.join(", ") : "semua role"}
      </span>
      <MenuForm mode="edit" initial={item} />
      <button
        type="button"
        className="text-sm text-destructive hover:underline"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Hapus menu "${item.label}"?`)) return;
          start(async () => {
            await deleteMenu(item.id);
            router.refresh();
          });
        }}
      >
        Hapus
      </button>
    </div>
  );
}
