"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import type { FolderNode } from "@/server/queries/direktori";

function Node({
  node,
  activeId,
  depth,
}: {
  node: FolderNode;
  activeId: string | null;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const active = activeId === node.id;

  return (
    <div role="treeitem" aria-selected={active} aria-expanded={hasChildren ? open : undefined}>
      <div
        className={
          "group flex min-w-0 items-center gap-1 rounded-md pr-1.5 text-sm transition-colors " +
          (active
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted")
        }
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={
            "flex size-5 shrink-0 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
            (hasChildren ? "hover:bg-black/10" : "invisible")
          }
          aria-label={
            hasChildren
              ? `${open ? "Tutup" : "Buka"} subdirektori ${node.nama}`
              : undefined
          }
          aria-expanded={hasChildren ? open : undefined}
          disabled={!hasChildren}
          tabIndex={hasChildren ? 0 : -1}
        >
          {hasChildren &&
            (open ? (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-3.5" aria-hidden="true" />
            ))}
        </button>
        <Link
          href={`/arsip-pegawai/${node.id}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-current={active ? "page" : undefined}
          title={node.nama}
        >
          {open && hasChildren ? (
            <FolderOpen className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
          ) : (
            <Folder className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
          )}
          <span className="truncate">{node.nama}</span>
        </Link>
      </div>
      {open &&
        node.children.map((c) => (
          <Node key={c.id} node={c} activeId={activeId} depth={depth + 1} />
        ))}
    </div>
  );
}

export function FolderTree({
  nodes,
  activeId,
}: {
  nodes: FolderNode[];
  activeId: string | null;
}) {
  if (!nodes.length) {
    return (
      <p className="px-2 py-3 text-xs text-muted-foreground">Belum ada direktori.</p>
    );
  }
  return (
    <nav
      className="flex min-w-0 flex-col gap-0.5"
      aria-label="Struktur direktori arsip pegawai"
      role="tree"
    >
      {nodes.map((n) => (
        <Node key={n.id} node={n} activeId={activeId} depth={0} />
      ))}
    </nav>
  );
}
