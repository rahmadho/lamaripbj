"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, BookOpen, Phone, ShieldCheck } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      if (res.code === "configuration" || res.error === "Configuration") {
        setError("Terlalu banyak percobaan login. Silakan tunggu sebentar lalu coba lagi.");
      } else {
        setError("Username atau password salah");
      }
      return;
    }
    router.push(params.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel institusional */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-accent-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-2.5">
          <Image
            src="/img/icon-ukpbj.png"
            alt="Logo UKPBJ"
            width={36}
            height={36}
            className="size-9 rounded-md object-contain"
            priority
          />
          <span className="font-heading text-sm font-semibold tracking-wide">LAMARI</span>
        </div>

        <div className="relative max-w-md space-y-5">
          <h1 className="font-heading text-4xl leading-[1.1] font-bold tracking-tight text-sidebar-accent-foreground">
            Arsip kantor yang rapi, terlacak, dan aman.
          </h1>
          <p className="text-sm leading-relaxed text-sidebar-foreground/75">
            Kelola arsip pegawai berbasis direktori dan arsip pengadaan (PBJ) per paket
            dalam satu sistem kearsipan terpadu.
          </p>
          <ul className="space-y-2.5 text-sm text-sidebar-foreground/85">
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-sidebar-primary" aria-hidden="true" />
              Hak akses per role, perorangan, dan grup
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-sidebar-primary" aria-hidden="true" />
              Jejak audit setiap akses dokumen
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-sidebar-primary" aria-hidden="true" />
              Arsip PBJ terkelompok jenis &amp; metode pengadaan
            </li>
          </ul>
          <div className="space-y-2.5 pt-1">
            <p className="text-[11px] uppercase tracking-widest text-sidebar-foreground/50">
              Terintegrasi dengan
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://spse.inaproc.id/sumbarprov"
                target="_blank"
                rel="noopener noreferrer"
                title="SPSE Sumatera Barat"
                className="rounded-md bg-white/95 p-2 transition-opacity hover:opacity-85"
              >
                <Image
                  src="/img/LPSE.png"
                  alt="Logo SPSE"
                  width={96}
                  height={48}
                  className="h-10 w-auto object-contain"
                />
              </a>
              <a
                href="https://sipedal.sumbarprov.go.id/"
                target="_blank"
                rel="noopener noreferrer"
                title="Sipedal Sumatera Barat"
                className="flex items-center gap-2.5 rounded-md bg-white/95 p-2 transition-opacity hover:opacity-85"
              >
                <Image
                  src="/img/sipedal.png"
                  alt="Logo Sipedal"
                  width={40}
                  height={40}
                  className="h-10 w-auto object-contain"
                />
                <span className="text-left text-sm leading-snug text-slate-700">
                  Sistem Informasi Pengendalian
                  <br />
                  Pengadaan Barang dan Jasa
                </span>
              </a>
            </div>
          </div>
        </div>

        <p className="relative text-[11px] uppercase tracking-widest text-sidebar-foreground/50">
          Sistem Kearsipan Terpadu
        </p>
      </div>

      {/* Panel formulir */}
      <div className="relative flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex items-center gap-2.5">
              <Image
                src="/img/icon-ukpbj.png"
                alt="Logo UKPBJ"
                width={36}
                height={36}
                className="size-9 rounded-md object-contain"
              />
              <span className="font-heading text-sm font-semibold">LAMARI</span>
            </div>
          </div>

          <div className="mb-6 space-y-1.5">
            <p className="label-caps text-muted-foreground">Masuk ke sistem</p>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              Selamat datang kembali
            </h2>
            <p className="text-sm text-muted-foreground">
              Gunakan akun kantor Anda untuk melanjutkan.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="label-caps text-muted-foreground">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="mis. admin"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="label-caps text-muted-foreground">
                Password
              </Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>

            <nav
              aria-label="Bantuan"
              className="mt-1 flex items-stretch justify-center border-t border-border pt-3 text-[13px]"
            >
              <Link
                href="/panduan"
                className="group inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <BookOpen
                  className="size-4 text-muted-foreground/60 transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
                Lihat Panduan
              </Link>
              <span className="my-1.5 w-px shrink-0 bg-border" aria-hidden="true" />
              <Link
                href="/hubungi-kami"
                className="group inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Phone
                  className="size-4 text-muted-foreground/60 transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
                Hubungi Kami
              </Link>
            </nav>
          </form>
        </div>
      </div>
    </div>
  );
}
