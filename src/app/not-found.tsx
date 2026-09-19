import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">404 — Halaman Tidak Ditemukan</CardTitle>
          <CardDescription>
            Alamat yang Anda tuju tidak ada, sudah dipindahkan, atau Anda tidak
            memiliki tautan yang benar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          <Button nativeButton={false} render={<Link href="/dashboard" />}>
            Ke Dashboard
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/cari" />}>
            Cari Arsip
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
