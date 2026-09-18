import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAuditLog, getDaftarAksiAudit } from "@/server/queries/laporan";
import { AuditFilter } from "@/components/audit-filter";
import { Pagination } from "@/components/pagination";
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

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?: string;
    aksi?: string;
    dari?: string;
    sampai?: string;
    page?: string;
    perPage?: string;
  }>;
}) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/tidak-berhak");
  const sp = await searchParams;

  const [data, users, aksiList] = await Promise.all([
    getAuditLog({
      userId: sp.userId,
      aksi: sp.aksi,
      dari: sp.dari,
      sampai: sp.sampai,
      page: sp.page ? Number(sp.page) : 1,
      perPage: sp.perPage ? Number(sp.perPage) : undefined,
    }),
    prisma.user.findMany({ select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
    getDaftarAksiAudit(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        label="Administrasi"
        judul="Audit Log"
        deskripsi={`Riwayat aktivitas pengguna pada sistem (${data.total} entri).`}
      />

      <Suspense>
        <AuditFilter users={users} aksiList={aksiList} />
      </Suspense>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Waktu</TableHead>
            <TableHead>Pengguna</TableHead>
            <TableHead>Aksi</TableHead>
            <TableHead>Entitas</TableHead>
            <TableHead>Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Tidak ada aktivitas
              </TableCell>
            </TableRow>
          ) : (
            data.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                  {r.createdAt.toLocaleString("id-ID")}
                </TableCell>
                <TableCell className="font-medium">{r.user?.nama ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="info">{r.aksi}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.entitas}</TableCell>
                <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                  {r.detail ? JSON.stringify(r.detail) : "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {data.total > 0 && (
        <Pagination
          halaman={data.page}
          totalHalaman={data.totalPage}
          total={data.total}
          perHalaman={data.perPage}
          label="entri"
          paramPerHalaman="perPage"
        />
      )}
    </div>
  );
}
