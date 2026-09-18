"use client";

import { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "cn";

/**
 * Input password dengan tombol tampilkan/sembunyikan.
 * Semua prop `Input` tetap tersedia; ikon berada di dalam sisi kanan.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(function PasswordInput({ className, ...props }, ref) {
  const [lihat, setLihat] = useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={lihat ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setLihat((p) => !p)}
        aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
        aria-pressed={lihat}
        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {lihat ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
});
