import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const menus = await prisma.menuItem.findMany({
    where: {
      aktif: true,
      parentId: null,
      OR: [{ roles: { isEmpty: true } }, { roles: { has: session?.user?.role as never } }],
    },
    orderBy: { urutan: "asc" },
  });

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Lompat ke konten utama
      </a>

      <aside
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex"
        aria-label="Navigasi utama"
      >
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
          <Image
            src="/img/icon-ukpbj.png"
            alt="Logo UKPBJ"
            width={36}
            height={36}
            className="size-9 rounded-md object-contain"
            priority
          />
          <div className="leading-tight">
            <p className="font-heading text-sm font-semibold text-sidebar-accent-foreground">
              LAMARI
            </p>
            <p className="text-[11px] text-sidebar-foreground/70">Arsip Pegawai &amp; PBJ</p>
          </div>
        </div>

        <SidebarNav
          items={menus.map((m) => ({
            key: m.key,
            label: m.label,
            path: m.path,
            grup: m.grup,
          }))}
        />

        <div className="mt-auto border-t border-sidebar-border p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-md bg-sidebar-accent/60 px-2.5 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary/90 text-xs font-semibold text-sidebar-primary-foreground">
              {inisial(session?.user?.name ?? "?")}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <Link
                href="/profil"
                className="block truncate text-sm font-medium text-sidebar-accent-foreground hover:text-sidebar-primary"
              >
                {session?.user?.name}
              </Link>
              <p className="truncate text-[11px] uppercase tracking-wide text-sidebar-foreground/60">
                {session?.user?.role}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Image
              src="/img/icon-ukpbj.png"
              alt="Logo UKPBJ"
              width={32}
              height={32}
              className="size-8 rounded-md object-contain"
            />
            <span className="font-heading text-sm font-semibold">LAMARI</span>
          </div>
          <div className="hidden items-center gap-2 text-xs md:flex">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Beranda
            </Link>
            <span className="text-border">/</span>
            <span className="label-caps text-muted-foreground">Ruang Kerja Arsip</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="md:hidden">
              <SignOutButton />
            </div>
          </div>
        </header>

        <main id="konten-utama" className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function inisial(nama: string) {
  return nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
