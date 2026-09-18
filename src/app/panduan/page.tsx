import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Panduan | LAMARI" };

export default function PanduanPage() {
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
        <div className="w-full max-w-md animate-rise space-y-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm">
            <BookOpen className="size-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="label-caps text-muted-foreground">Panduan penggunaan</p>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Belum ada panduan
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Panduan penggunaan aplikasi belum tersedia saat ini. Silakan hubungi
              administrator atau kunjungi halaman Hubungi Kami untuk bantuan.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button render={<Link href="/login" />}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali ke Login
            </Button>
            <Button variant="outline" render={<Link href="/hubungi-kami" />}>
              Hubungi Kami
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
