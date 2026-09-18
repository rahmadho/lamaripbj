import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSemuaTaksonomi } from "@/server/queries/arsip-pbj";
import {
  JenisDocBaru,
  EditJenisDoc,
  PetaForm,
  HapusPetaButton,
} from "@/components/taksonomi-forms";
import { HapusJenisDocButton } from "@/components/taksonomi-delete";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

const JENIS_LABEL: Record<string, string> = {
  BARANG: "Barang",
  KONSTRUKSI: "Konstruksi",
  JASA_KONSULTANSI: "Jasa Konsultansi",
  JASA_LAINNYA: "Jasa Lainnya",
};

export default async function TaksonomiPage() {
  const session = await auth();
  const role = session?.user.role;
  if (role !== "ADMIN" && role !== "UPLOADER") redirect("/tidak-berhak");
  const docs = await getSemuaTaksonomi();

  return (
    <div className="space-y-6">
      <PageHeader
        label="Administrasi"
        judul="Taksonomi Dokumen PBJ"
        deskripsi='Jenis dokumen dan pemetaannya ke jenis/metode pengadaan. Pemetaan "Semua" berlaku umum.'
        aksi={<JenisDocBaru />}
      />

      <div className="space-y-4">
        {docs.length === 0 ? (
          <EmptyState
            ikon={<FileText className="size-5" aria-hidden="true" />}
            judul="Belum ada jenis dokumen"
            deskripsi="Tambahkan jenis dokumen PBJ lalu petakan ke jenis/metode pengadaan."
          />
        ) : (
          docs.map((d) => (
            <div key={d.id} className="elev-1 rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold tracking-tight">{d.nama}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-foreground">
                        {d.namaSingkat}
                      </span>
                      <span className="tabular-nums">Dipakai oleh {d._count.arsip} arsip</span>
                    </p>
                    {d.keterangan && (
                      <p className="mt-1 max-w-prose text-xs text-muted-foreground">{d.keterangan}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <EditJenisDoc
                    id={d.id}
                    nama={d.nama}
                    namaSingkat={d.namaSingkat}
                    keterangan={d.keterangan}
                  />
                  <HapusJenisDocButton id={d.id} nama={d.nama} />
                </div>
              </div>

              {d.peta.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-1.5">
                  {d.peta.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      <Badge variant="ghost" className="h-4 px-0">
                        {p.jenisPengadaan ? JENIS_LABEL[p.jenisPengadaan] : "Semua jenis"}
                      </Badge>
                      <span>{p.metodePengadaan ?? "Semua metode"}</span>
                      <HapusPetaButton id={p.id} />
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-border pt-3">
                <PetaForm docId={d.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
