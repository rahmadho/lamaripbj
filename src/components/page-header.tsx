import type { ReactNode } from "react";
import { cn } from "cn";

export function PageHeader({
  judul,
  deskripsi,
  aksi,
  label,
  className,
}: {
  judul: string;
  deskripsi?: string;
  aksi?: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5",
        className
      )}
    >
      <div className="space-y-1">
        {label && <p className="label-caps text-muted-foreground">{label}</p>}
        <h1 className="font-heading text-2xl font-bold tracking-tight">{judul}</h1>
        {deskripsi && <p className="max-w-2xl text-sm text-muted-foreground">{deskripsi}</p>}
      </div>
      {aksi && <div className="flex items-center gap-2">{aksi}</div>}
    </div>
  );
}
