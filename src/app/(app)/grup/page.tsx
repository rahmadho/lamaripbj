import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSemuaGrup, getKandidatAnggotaGrup } from "@/server/queries/admin";
import { GrupForm, HapusGrupButton } from "@/components/grup-forms";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { UsersRound, Users } from "lucide-react";

export default async function GrupPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/tidak-berhak");
  const [grups, kandidat] = await Promise.all([getSemuaGrup(), getKandidatAnggotaGrup()]);

  return (
    <div className="space-y-6">
      <PageHeader
        label="Administrasi"
        judul="Grup"
        deskripsi="Grup berisi Pejabat Fungsional; arsip PBJ dapat dibagikan ke grup."
        aksi={<GrupForm kandidat={kandidat} />}
      />

      <div className="space-y-3">
        {grups.length === 0 ? (
          <EmptyState
            ikon={<UsersRound className="size-5" aria-hidden="true" />}
            judul="Belum ada grup"
            deskripsi="Buat grup untuk mengelompokkan Pejabat Fungsional dan membagikan arsip PBJ."
          />
        ) : (
          grups.map((g) => (
            <div key={g.id} className="elev-1 rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-[var(--status-info)]/10 text-[var(--status-info)]">
                    <Users className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold tracking-tight">{g.nama}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {g.anggota.length} anggota · {g._count.shares} share aktif
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <GrupForm
                    mode="edit"
                    initial={{
                      id: g.id,
                      nama: g.nama,
                      anggotaIds: g.anggota.map((a) => a.userId),
                    }}
                    kandidat={kandidat}
                  />
                  <HapusGrupButton id={g.id} nama={g.nama} />
                </div>
              </div>
              {g.anggota.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                  {g.anggota.map((a) => (
                    <li
                      key={a.userId}
                      className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {a.user.nama}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
