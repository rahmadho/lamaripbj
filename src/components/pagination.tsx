"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deretHalaman } from "@/lib/pagination";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export function Pagination({
  halaman,
  totalHalaman,
  total,
  perHalaman,
  label = "entri",
  paramHalaman = "page",
  paramPerHalaman,
  opsiPerHalaman = [10, 25, 50, 100],
}: {
  halaman: number;
  totalHalaman: number;
  total: number;
  perHalaman: number;
  /** Kata benda untuk ringkasan, mis. "entri" / "paket". */
  label?: string;
  paramHalaman?: string;
  /** Bila diisi, tampilkan pemilih jumlah per halaman dengan param ini. */
  paramPerHalaman?: string;
  opsiPerHalaman?: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function ke(h: number, per?: number) {
    const next = new URLSearchParams(params.toString());
    next.set(paramHalaman, String(h));
    if (per != null && paramPerHalaman) next.set(paramPerHalaman, String(per));
    router.push(`${pathname}?${next.toString()}`);
  }

  const awal = total === 0 ? 0 : (halaman - 1) * perHalaman + 1;
  const akhir = Math.min(halaman * perHalaman, total);

  return (
    <nav
      className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Navigasi halaman"
    >
      {/* Ringkasan + pemilih per halaman */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs text-muted-foreground tabular-nums" role="status">
          Menampilkan <span className="font-medium text-foreground">{awal}</span>–
          <span className="font-medium text-foreground">{akhir}</span> dari{" "}
          <span className="font-medium text-foreground">{total}</span> {label}
        </p>
        {paramPerHalaman && (
          <div className="flex items-center gap-1.5">
            <label htmlFor="per-halaman" className="text-xs text-muted-foreground">
              Baris
            </label>
            <Select
              items={opsiPerHalaman.map((n) => ({ value: String(n), label: String(n) }))}
              value={String(perHalaman)}
              onValueChange={(v) => ke(1, Number(v))}
            >
              <SelectTrigger
                id="per-halaman"
                size="sm"
                className="w-[4.5rem]"
                aria-label="Jumlah baris per halaman"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opsiPerHalaman.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Kontrol halaman */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={halaman <= 1}
          onClick={() => ke(1)}
          aria-label="Halaman pertama"
        >
          <ChevronsLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={halaman <= 1}
          onClick={() => ke(halaman - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-0.5 px-0.5" role="group" aria-label="Pilih halaman">
          {deretHalaman(halaman, totalHalaman).map((h, i) =>
            h === "…" ? (
              <span
                key={`ellipsis-${i}`}
                className="px-1 text-xs text-muted-foreground select-none"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <Button
                key={h}
                variant={h === halaman ? "default" : "ghost"}
                size="icon-sm"
                className="tabular-nums"
                onClick={() => ke(h)}
                aria-label={`Halaman ${h}`}
                aria-current={h === halaman ? "page" : undefined}
              >
                {h}
              </Button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          disabled={halaman >= totalHalaman}
          onClick={() => ke(halaman + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={halaman >= totalHalaman}
          onClick={() => ke(totalHalaman)}
          aria-label="Halaman terakhir"
        >
          <ChevronsRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
