"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { updateProfilSendiri, gantiPasswordSendiri } from "@/server/actions/user";
import { AlertCircle, Check, KeyRound, UserRound } from "lucide-react";

function Pesan({ tipe, isi }: { tipe: "ok" | "err"; isi: string }) {
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
        tipe === "ok"
          ? "border-status-verified/30 bg-status-verified/10 text-status-verified"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {tipe === "ok" ? (
        <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <span>{isi}</span>
    </div>
  );
}

export function FormProfil({
  initial,
}: {
  initial: { nama: string; email: string; role: string };
}) {
  const router = useRouter();
  const [nama, setNama] = useState(initial.nama);
  const [email, setEmail] = useState(initial.email);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSukses(false);
    start(async () => {
      const res = await updateProfilSendiri({ nama, email });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSukses(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <UserRound className="size-4" aria-hidden="true" />
        <span className="label-caps">Data Diri</span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profil-nama">Nama Lengkap</Label>
        <Input
          id="profil-nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
          maxLength={150}
          autoComplete="name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profil-email">Email</Label>
        <Input
          id="profil-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <p className="text-xs text-muted-foreground">
          Email dipakai untuk login. Role {initial.role} hanya bisa diubah admin.
        </p>
      </div>

      {error && <Pesan tipe="err" isi={error} />}
      {sukses && <Pesan tipe="ok" isi="Profil berhasil diperbarui" />}

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    </form>
  );
}

export function FormGantiPassword() {
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSukses(false);
    if (baru !== konfirmasi) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    start(async () => {
      const res = await gantiPasswordSendiri(lama, baru);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSukses(true);
      setLama("");
      setBaru("");
      setKonfirmasi("");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <KeyRound className="size-4" aria-hidden="true" />
        <span className="label-caps">Ganti Password</span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw-lama">Password Lama</Label>
        <PasswordInput
          id="pw-lama"
          value={lama}
          onChange={(e) => setLama(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw-baru">Password Baru</Label>
        <PasswordInput
          id="pw-baru"
          value={baru}
          onChange={(e) => setBaru(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">Minimal 6 karakter.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw-konfirmasi">Konfirmasi Password Baru</Label>
        <PasswordInput
          id="pw-konfirmasi"
          value={konfirmasi}
          onChange={(e) => setKonfirmasi(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      {error && <Pesan tipe="err" isi={error} />}
      {sukses && <Pesan tipe="ok" isi="Password berhasil diganti" />}

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Ganti Password"}
      </Button>
    </form>
  );
}
