"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Bisa dialihkan ke layanan log eksternal bila sudah tersedia.
    console.error("Terjadi kesalahan halaman:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Terjadi Kesalahan</CardTitle>
          <CardDescription>
            Maaf, ada masalah saat memuat halaman ini. Coba muat ulang, atau kembali
            ke dashboard bila masih gagal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Kode kesalahan: <span className="font-mono">{error.digest}</span>
            </p>
          )}
          <div className="flex justify-center gap-2">
            <Button onClick={reset}>Coba Lagi</Button>
            <Button variant="outline" render={<Link href="/dashboard" />}>
              Ke Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
