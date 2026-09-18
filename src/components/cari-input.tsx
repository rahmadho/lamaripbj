"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CariInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  return (
    <form
      className="flex gap-2"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/cari?q=${encodeURIComponent(q)}`);
      }}
    >
      <label htmlFor="cari-q" className="sr-only">
        Kata kunci pencarian arsip
      </label>
      <Input
        id="cari-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Kata kunci (min. 2 huruf)..."
        className="max-w-md"
        aria-label="Kata kunci pencarian arsip"
      />
      <Button type="submit">Cari</Button>
    </form>
  );
}
