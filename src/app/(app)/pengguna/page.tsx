import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSemuaUser } from "@/server/queries/laporan";
import { UserForm, ToggleAktifButton } from "@/components/user-forms";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  PIMPINAN: "Pimpinan",
  PEJABAT_FUNGSIONAL: "Pejabat Fungsional",
  STAFF: "Staff",
  UPLOADER: "Uploader",
};

export default async function PenggunaPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/tidak-berhak");
  const users = await getSemuaUser();

  return (
    <div className="space-y-6">
      <PageHeader
        label="Administrasi"
        judul="Pengguna"
        deskripsi="Kelola akun dan role pengguna."
        aksi={<UserForm />}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Arsip</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.nama}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <Badge variant="info">{ROLE_LABEL[u.role] ?? u.role}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {u._count.arsipPegawai} pegawai · {u._count.arsipPbj} PBJ
              </TableCell>
              <TableCell>
                <ToggleAktifButton id={u.id} aktif={u.aktif} />
              </TableCell>
              <TableCell className="text-right">
                <UserForm
                  mode="edit"
                  initial={{
                    id: u.id,
                    nama: u.nama,
                    email: u.email,
                    role: u.role,
                    aktif: u.aktif,
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
