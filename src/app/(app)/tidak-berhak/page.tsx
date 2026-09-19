import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function TidakBerhakPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">403 — Akses Ditolak</CardTitle>
          <CardDescription>
            Anda tidak memiliki hak untuk membuka halaman ini. Hubungi admin bila Anda
            merasa seharusnya punya akses.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          <Button nativeButton={false} render={<Link href="/dashboard" />}>
            Ke Dashboard
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/dibagikan" />}>
            Arsip Dibagikan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
