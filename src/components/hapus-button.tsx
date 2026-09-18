"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteDirektori } from "@/server/actions/direktori";
import { deleteArsipPegawai } from "@/server/actions/arsip-pegawai";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function HapusButton({
  jenis,
  id,
  redirectTo,
  label = "Hapus",
  deskripsi,
}: {
  jenis: "direktori" | "arsip";
  id: string;
  redirectTo?: string;
  label?: string;
  deskripsi?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doDelete() {
    setError(null);
    start(async () => {
      const res =
        jenis === "direktori" ? await deleteDirektori(id) : await deleteArsipPegawai(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="destructive-ghost"
            size="sm"
            disabled={pending}
          />
        }
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {pending ? "Menghapus..." : label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
          <AlertDialogDescription>
            {deskripsi ?? "Data yang dihapus tidak dapat dikembalikan."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={doDelete}>Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
