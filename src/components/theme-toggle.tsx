"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPSI = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Ikuti Sistem", icon: Monitor },
] as const;

// Menandai apakah sudah hidrasi (client) tanpa setState di effect.
const kosongLangganan = () => () => {};
function useSudahMount() {
  return useSyncExternalStore(
    kosongLangganan,
    () => true,
    () => false
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSudahMount();

  const aktif = OPSI.find((o) => o.value === theme) ?? OPSI[2];
  const Ikon = mounted ? aktif.icon : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={className}
            aria-label="Ubah tema tampilan"
          />
        }
      >
        <Ikon className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="elev-3 min-w-40">
        {OPSI.map((o) => {
          const I = o.icon;
          return (
            <DropdownMenuItem
              key={o.value}
              onClick={() => setTheme(o.value)}
              className={theme === o.value ? "font-medium text-primary" : undefined}
            >
              <I className="size-4" aria-hidden="true" />
              {o.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
