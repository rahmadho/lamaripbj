import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Hubungi Kami | LAMARI" };

const KONTAK = [
  {
    label: "Website",
    deskripsi: "biropbj.sumbarprov.go.id",
    href: "https://biropbj.sumbarprov.go.id",
  },
  {
    label: "Instagram",
    deskripsi: "@bpbj.sumbar",
    href: "https://www.instagram.com/bpbj.sumbar",
  },
  {
    label: "Facebook",
    deskripsi: "Biro PBJ Sumatera Barat",
    href: "https://www.facebook.com/profile.php?id=100083868654866",
  },
  {
    label: "Whatsapp",
    deskripsi: "+62 821-7376-3559",
    href: "https://api.whatsapp.com/send?phone=6282173763559",
  },
] as const;

const ALAMAT =
  "Biro Pengadaan Barang dan Jasa, Jalan Jenderal Sudirman, Padang, Sumatera Barat";

export default function HubungiKamiPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4 md:px-8">
        <Link href="/login" className="flex items-center gap-2.5">
          <Image
            src="/img/icon-ukpbj.png"
            alt="Logo UKPBJ"
            width={32}
            height={32}
            className="size-8 rounded-md object-contain"
          />
          <span className="font-heading text-sm font-semibold">LAMARI</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md animate-rise space-y-6">
          <div className="space-y-1.5 text-center">
            <p className="label-caps text-muted-foreground">Bantuan &amp; kontak</p>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Hubungi Kami
            </h1>
            <p className="text-sm text-muted-foreground">
              Biro Pengadaan Barang dan Jasa Provinsi Sumatera Barat
            </p>
          </div>

          <ul className="space-y-2">
            {KONTAK.map(({ label, deskripsi, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {deskripsi}
                    </span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
            ))}
            <li>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <MapPin className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Tatap Muka</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {ALAMAT}
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ALAMAT)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    Lihat di Google Maps
                  </a>
                </span>
              </div>
            </li>
          </ul>

          <div className="text-center">
            <Button nativeButton={false} variant="outline" render={<Link href="/login" />}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali ke Login
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
