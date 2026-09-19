import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FormProfil, FormGantiPassword } from "@/components/profil-forms";

export const metadata: Metadata = { title: "Profil | LAMARI" };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  PIMPINAN: "Pimpinan",
  PEJABAT_FUNGSIONAL: "Pejabat Fungsional",
  STAFF: "Staff",
  UPLOADER: "Uploader",
};

export default async function ProfilPage() {
  const session = await auth();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nama: true, username: true, email: true, role: true, createdAt: true },
  });
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader label="Akun" judul="Profil Saya" deskripsi="Perbarui data diri dan keamanan akun Anda." />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-semibold text-primary">
            {user.nama
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-semibold tracking-tight">{user.nama}</p>
            <p className="truncate text-sm text-muted-foreground">
              @{user.username}
              {user.email ? ` · ${user.email}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="info">{ROLE_LABEL[user.role] ?? user.role}</Badge>
            <p className="text-xs text-muted-foreground tabular-nums">
              Anggota sejak {user.createdAt.toLocaleDateString("id-ID")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent>
            <FormProfil
              initial={{
                nama: user.nama,
                username: user.username,
                email: user.email ?? "",
                role: ROLE_LABEL[user.role] ?? user.role,
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <FormGantiPassword />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
