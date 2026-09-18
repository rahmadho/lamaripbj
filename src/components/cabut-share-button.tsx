"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hapusShare } from "@/server/actions/arsip-pegawai";
import { X, AlertCircle } from "lucide-react";

export function CabutShareButton({
  id,
  nama,
}: {
  id: string;
  nama: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        disabled={pending}
        aria-label={`Cabut akses untuk ${nama}`}
        title="Cabut akses"
        onClick={() => {
          if (!confirm(`Cabut akses untuk "${nama}"?`)) return;
          setError(null);
          start(async () => {
            const res = await hapusShare(id);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.refresh();
          });
        }}
        className="flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
      {error && (
        <span
          role="alert"
          className="absolute top-full right-0 z-10 mt-1 flex w-56 items-start gap-1.5 rounded-md border border-destructive/30 bg-popover px-2.5 py-2 text-xs text-destructive shadow-md"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </span>
      )}
    </span>
  );
}
