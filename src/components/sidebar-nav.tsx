"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderTree,
  FileText,
  Share2,
  Search,
  Boxes,
  ShieldCheck,
  ScrollText,
  Menu as MenuIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

const IKON: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  "arsip-pegawai": FolderTree,
  "arsip-pbj": Boxes,
  dibagikan: Share2,
  cari: Search,
  pengguna: Users,
  grup: Users,
  taksonomi: FileText,
  menu: MenuIcon,
  "audit-log": ScrollText,
};

type NavItem = { key: string; label: string; path: string; grup?: string | null };

// Item tanpa grup tampil lebih dulu (tanpa heading), sisanya dikelompokkan
// per nama grup, urut sesuai kemunculan pertama (yang sudah tersortir `urutan`).
function kelompokkan(items: NavItem[]) {
  const tanpaGrup: NavItem[] = [];
  const grup = new Map<string, NavItem[]>();
  for (const item of items) {
    const nama = item.grup?.trim();
    if (!nama) {
      tanpaGrup.push(item);
      continue;
    }
    const isi = grup.get(nama);
    if (isi) isi.push(item);
    else grup.set(nama, [item]);
  }
  return { tanpaGrup, grup };
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { tanpaGrup, grup } = kelompokkan(items);

  function renderItem(item: NavItem) {
    const active = pathname === item.path || pathname.startsWith(item.path + "/");
    const Ikon = IKON[item.key] ?? ShieldCheck;
    return (
      <Link
        key={item.key}
        href={item.path}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
      >
        {active && (
          <span
            className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-sidebar-primary"
            aria-hidden="true"
          />
        )}
        <Ikon
          className={cn(
            "size-4 shrink-0",
            active ? "text-sidebar-primary" : "text-sidebar-foreground/60"
          )}
          aria-hidden="true"
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <nav
      className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
      aria-label="Menu aplikasi"
    >
      {tanpaGrup.length > 0 && <div className="flex flex-col gap-0.5">{tanpaGrup.map(renderItem)}</div>}

      {[...grup.entries()].map(([nama, isi]) => (
        <div key={nama} className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 pt-4 label-caps text-sidebar-foreground/45" aria-hidden="true">
            {nama}
          </p>
          {isi.map(renderItem)}
        </div>
      ))}
    </nav>
  );
}
