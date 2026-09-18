"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AuditFilter({
  users,
  aksiList,
}: {
  users: { id: string; nama: string }[];
  aksiList: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    if (value && value !== "__all") next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor="filter-user" className="text-xs">Pengguna</Label>
        <Select
          items={[{ value: "__all", label: "Semua" }, ...users.map((u) => ({ value: u.id, label: u.nama }))]}
          value={params.get("userId") ?? "__all"}
          onValueChange={(v) => setParam("userId", v as string)}
        >
          <SelectTrigger id="filter-user" className="w-full" aria-label="Filter pengguna">
            <SelectValue placeholder="Semua" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-aksi" className="text-xs">Aksi</Label>
        <Select
          items={[{ value: "__all", label: "Semua" }, ...aksiList.map((a) => ({ value: a, label: a }))]}
          value={params.get("aksi") ?? "__all"}
          onValueChange={(v) => setParam("aksi", v as string)}
        >
          <SelectTrigger id="filter-aksi" className="w-full" aria-label="Filter aksi">
            <SelectValue placeholder="Semua" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua</SelectItem>
            {aksiList.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-dari" className="text-xs">Dari Tanggal</Label>
        <Input
          id="filter-dari"
          type="date"
          defaultValue={params.get("dari") ?? ""}
          onChange={(e) => setParam("dari", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-sampai" className="text-xs">Sampai Tanggal</Label>
        <Input
          id="filter-sampai"
          type="date"
          defaultValue={params.get("sampai") ?? ""}
          onChange={(e) => setParam("sampai", e.target.value)}
        />
      </div>
      <div className="sm:col-span-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Reset filter
        </Button>
      </div>
    </div>
  );
}
