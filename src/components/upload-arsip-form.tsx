"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createArsipPegawai } from "@/server/actions/arsip-pegawai";

export function UploadArsipForm({ direktoriId }: { direktoriId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("direktoriId", direktoriId);
    setError(null);
    start(async () => {
      const res = await createArsipPegawai(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ Unggah Arsip</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unggah Arsip Pegawai</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nomorDokumen">Nomor Dokumen</Label>
            <Input id="nomorDokumen" name="nomorDokumen" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="namaDokumen">Nama Dokumen</Label>
            <Input id="namaDokumen" name="namaDokumen" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tanggal">Tanggal</Label>
            <Input id="tanggal" name="tanggal" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File (PDF/gambar/Office, maks 25 MB)</Label>
            <Input id="file" name="file" type="file" required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Mengunggah..." : "Unggah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
