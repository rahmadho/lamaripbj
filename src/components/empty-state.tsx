import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  judul,
  deskripsi,
  ikon,
  aksi,
  className,
}: {
  judul: string;
  deskripsi?: string;
  ikon?: ReactNode;
  aksi?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-12 text-center",
        className
      )}
      role="status"
    >
      {ikon && (
        <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {ikon}
        </div>
      )}
      <p className="font-medium">{judul}</p>
      {deskripsi && (
        <p className="max-w-sm text-sm text-muted-foreground">{deskripsi}</p>
      )}
      {aksi && <div className="mt-2">{aksi}</div>}
    </div>
  );
}
