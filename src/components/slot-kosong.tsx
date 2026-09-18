"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { lengkapiDokumenPaket } from "@/server/actions/arsip-pbj";
import { FilePlus2, Loader2 } from "lucide-react";

/**
 * Baris slot dokumen yang belum diunggah pada sebuah paket.
 * Menampilkan tombol "Lengkapi" — memilih berkas langsung mengunggah.
 */
export function SlotKosong({
  paketId,
  docId,
  nama,
}: {
  paketId: string;
  docId: string;
  nama: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="group/slot flex items-center gap-3 border-dashed bg-surface-subtle/20 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-muted-foreground" title={nama}>
          {nama}
        </span>
        <span className="block text-xs italic text-muted-foreground/70">
          Belum diunggah — berkas yang diharapkan
        </span>
        {error && <span className="block text-xs text-destructive">{error}</span>}
      </span>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        aria-label={`Unggah berkas ${nama}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setError(null);
          const fd = new FormData();
          fd.set("paketId", paketId);
          fd.set("taksonomiJenisDocId", docId);
          fd.set("file", file);
          start(async () => {
            const res = await lengkapiDokumenPaket(fd);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            if (inputRef.current) inputRef.current.value = "";
            router.refresh();
          });
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <FilePlus2 className="size-4" aria-hidden="true" />
        )}
        Lengkapi
      </Button>
    </li>
  );
}
