import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSemuaMenu } from "@/server/queries/admin";
import { MenuForm, MenuRowActions } from "@/components/menu-forms";
import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MenuPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/tidak-berhak");
  const menus = await getSemuaMenu();

  return (
    <div className="space-y-6">
      <PageHeader
        label="Administrasi"
        judul="Konfigurasi Menu"
        deskripsi="Atur item sidebar, urutan, dan visibilitas per role — tanpa deploy ulang."
        aksi={<MenuForm />}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Urutan</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Grup</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {menus.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Belum ada menu
              </TableCell>
            </TableRow>
          ) : (
            menus.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="tabular-nums text-muted-foreground">{m.urutan}</TableCell>
                <TableCell className="font-mono text-xs">{m.key}</TableCell>
                <TableCell className="font-medium">{m.label}</TableCell>
                <TableCell className="text-muted-foreground">{m.path}</TableCell>
                <TableCell>
                  {m.grup ? (
                    <span className="text-xs text-muted-foreground">{m.grup}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <MenuRowActions
                    item={{
                      id: m.id,
                      key: m.key,
                      label: m.label,
                      path: m.path,
                      grup: m.grup,
                      urutan: m.urutan,
                      aktif: m.aktif,
                      roles: m.roles,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
