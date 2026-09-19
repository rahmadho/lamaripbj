"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createUser, updateUser, toggleAktifUser } from "@/server/actions/user";

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "PIMPINAN", label: "Pimpinan" },
  { value: "PEJABAT_FUNGSIONAL", label: "Pejabat Fungsional" },
  { value: "STAFF", label: "Staff" },
  { value: "UPLOADER", label: "Uploader" },
];

type UserItem = {
  id: string;
  nama: string;
  username: string;
  email: string | null;
  role: string;
  aktif: boolean;
};

export function UserForm({ mode = "create", initial }: { mode?: "create" | "edit"; initial?: UserItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nama: initial?.nama ?? "",
    username: initial?.username ?? "",
    email: initial?.email ?? "",
    role: initial?.role ?? "STAFF",
    aktif: initial?.aktif ?? true,
    password: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res =
        mode === "edit" && initial
          ? await updateUser(initial.id, {
              nama: form.nama,
              username: form.username,
              email: form.email,
              role: form.role,
              aktif: form.aktif,
              password: form.password || undefined,
            })
          : await createUser({
              nama: form.nama,
              username: form.username,
              email: form.email,
              role: form.role,
              password: form.password,
            });
      if (!res.ok) return setError(res.error);
      setOpen(false);
      if (mode === "create")
        setForm({ ...form, nama: "", username: "", email: "", password: "" });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={mode === "edit" ? "outline" : "default"} />}>
        {mode === "edit" ? "Ubah" : "+ Pengguna Baru"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Ubah Pengguna" : "Pengguna Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nama">Nama</Label>
            <Input
              id="nama"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoCapitalize="none"
              spellCheck={false}
              placeholder="mis. budi.santoso"
            />
            <p className="text-xs text-muted-foreground">
              Dipakai untuk login. Huruf kecil, angka, titik, garis bawah, atau strip.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (opsional)</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nama@kantor.go.id"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Role</Label>
            <Select
              items={ROLES}
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v as string })}
            >
              <SelectTrigger id="user-role" className="w-full" aria-label="Role pengguna">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              Password {mode === "edit" && "(kosongkan bila tidak diubah)"}
            </Label>
            <PasswordInput
              id="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={mode === "create"}
            />
          </div>
          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <input
                id="aktif"
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
              />
              <Label htmlFor="aktif">Aktif</Label>
            </div>
          )}
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

export function ToggleAktifButton({ id, aktif }: { id: string; aktif: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant={aktif ? "default" : "secondary"}>{aktif ? "Aktif" : "Nonaktif"}</Badge>
      <button
        type="button"
        className="text-xs text-primary hover:underline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await toggleAktifUser(id, !aktif);
            if (!res.ok) setError(res.error);
            router.refresh();
          })
        }
      >
        {aktif ? "nonaktifkan" : "aktifkan"}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
