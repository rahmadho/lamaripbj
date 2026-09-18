"use client";

import { useTransition } from "react";
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
import { deleteJenisDoc } from "@/server/actions/taksonomi";

export function HapusJenisDocButton({ id, nama }: { id: string; nama: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<button type="button" className="text-sm text-destructive hover:underline" />}
      >
        {pending ? "Menghapus..." : "Hapus"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus jenis dokumen?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{nama}&quot; akan dihapus. Tidak bisa dilakukan jika masih dipakai arsip.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                await deleteJenisDoc(id);
                router.refresh();
              })
            }
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
