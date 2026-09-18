"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createJenisDoc, updateJenisDoc, upsertPeta, deletePeta } from "@/server/actions/taksonomi";
import { JENIS_PENGADAAN, METODE_PENGADAAN } from "@/lib/pbj";
import { Pencil } from "lucide-react";

const JENIS = JENIS_PENGADAAN.map((j) => [j.value, j.label] as const);
const METODE = METODE_PENGADAAN.map((m) => [m.value, m.label] as const);

type DocNilai = { nama: string; namaSingkat: string; keterangan: string };

// Isi form dipisah supaya state-nya terinisialisasi dari props hanya saat dialog
// dibuka (pola hindari setState-in-effect).
function IsiFormDoc({
  awal,
  pending,
  error,
  onSimpan,
  onBatal,
}: {
  awal: DocNilai;
  pending: boolean;
  error: string | null;
  onSimpan: (nilai: DocNilai) => void;
  onBatal: () => void;
}) {
  const [nama, setNama] = useState(awal.nama);
  const [namaSingkat, setNamaSingkat] = useState(awal.namaSingkat);
  const [keterangan, setKeterangan] = useState(awal.keterangan);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSimpan({ nama, namaSingkat, keterangan });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="doc-nama">Nama</Label>
        <Input
          id="doc-nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="mis. Berita Acara Review"
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="doc-singkat">Nama Singkat</Label>
        <Input
          id="doc-singkat"
          value={namaSingkat}
          onChange={(e) => setNamaSingkat(e.target.value)}
          placeholder="mis. BAR"
          required
          maxLength={50}
          className="font-mono uppercase"
        />
        <p className="text-xs text-muted-foreground">
          Dipakai sebagai bagian nama file saat diunduh.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="doc-ket">Keterangan (opsional)</Label>
        <Textarea
          id="doc-ket"
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Penjelasan singkat mengenai jenis dokumen ini"
          maxLength={500}
          rows={3}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBatal} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function JenisDocBaru() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ Jenis Dokumen</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Jenis Dokumen Baru</DialogTitle>
          <DialogDescription>
            Tambahkan jenis dokumen PBJ beserta nama singkat untuk penamaan file.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <IsiFormDoc
            awal={{ nama: "", namaSingkat: "", keterangan: "" }}
            pending={pending}
            error={error}
            onBatal={() => setOpen(false)}
            onSimpan={(nilai) => {
              setError(null);
              start(async () => {
                const res = await createJenisDoc(nilai);
                if (!res.ok) return setError(res.error);
                setOpen(false);
                router.refresh();
              });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditJenisDoc({
  id,
  nama,
  namaSingkat,
  keterangan,
}: {
  id: string;
  nama: string;
  namaSingkat: string;
  keterangan: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Jenis Dokumen</DialogTitle>
          <DialogDescription>Ubah nama, nama singkat, dan keterangan jenis dokumen.</DialogDescription>
        </DialogHeader>
        {open && (
          <IsiFormDoc
            awal={{ nama, namaSingkat, keterangan: keterangan ?? "" }}
            pending={pending}
            error={error}
            onBatal={() => setOpen(false)}
            onSimpan={(nilai) => {
              setError(null);
              start(async () => {
                const res = await updateJenisDoc(id, nilai);
                if (!res.ok) return setError(res.error);
                setOpen(false);
                router.refresh();
              });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PetaForm({ docId }: { docId: string }) {
  const router = useRouter();
  const [jenis, setJenis] = useState<string[]>([]);
  const [metode, setMetode] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);

  function toggle(list: string[], v: string, set: (x: string[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function submit() {
    setPesan(null);
    if (jenis.length === 0 && metode.length === 0) {
      setPesan("Pilih minimal satu jenis atau metode.");
      return;
    }
    start(async () => {
      // Semantik OR: pilihan dianggap gabungan.
      // - jenis dipilih saja => satu peta per jenis, berlaku semua metode
      // - metode dipilih saja => satu peta per metode, berlaku semua jenis
      // - keduanya => satu peta per jenis (berlaku semua metode) + satu peta per metode (berlaku semua jenis)
      const jenisEff = jenis.length > 0 ? jenis : [null];
      const metodeEff = metode.length > 0 ? metode : [null];
      const baris: { jenisPengadaan: string | null; metodePengadaan: string | null }[] = [];
      for (const j of jenisEff) {
        for (const m of metodeEff) {
          // hindari duplikasi "semua" x "semua"
          if (j === null && m === null && (jenis.length > 0 || metode.length > 0)) continue;
          baris.push({ jenisPengadaan: j, metodePengadaan: m });
        }
      }
      for (const b of baris) {
        const res = await upsertPeta({ taksonomiJenisDocId: docId, ...b });
        if (!res.ok) {
          setPesan(res.error);
          return;
        }
      }
      setJenis([]);
      setMetode([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2.5">
      <fieldset>
        <legend className="label-caps mb-1.5 text-muted-foreground">Jenis Pengadaan (opsional, boleh beberapa)</legend>
        <div className="flex flex-wrap gap-1.5">
          {JENIS.map(([v, l]) => {
            const aktif = jenis.includes(v);
            return (
              <button
                key={v}
                type="button"
                aria-pressed={aktif}
                onClick={() => toggle(jenis, v, setJenis)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  aktif
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label-caps mb-1.5 text-muted-foreground">Metode Pengadaan (opsional, boleh beberapa)</legend>
        <div className="flex flex-wrap gap-1.5">
          {METODE.map(([v, l]) => {
            const aktif = metode.includes(v);
            return (
              <button
                key={v}
                type="button"
                aria-pressed={aktif}
                onClick={() => toggle(metode, v, setMetode)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  aktif
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={submit} disabled={pending}>
          {pending ? "Menyimpan..." : "Tambah Pemetaan"}
        </Button>
        {pesan && (
          <p role="alert" className="text-xs text-destructive">
            {pesan}
          </p>
        )}
      </div>
    </div>
  );
}

export function HapusPetaButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-xs text-destructive hover:underline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deletePeta(id);
          router.refresh();
        })
      }
    >
      hapus
    </button>
  );
}
