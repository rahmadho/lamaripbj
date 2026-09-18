import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFileStream } from "@/lib/storage";
import { canAccessArsipPegawai, canAccessArsipPbj } from "@/lib/acl";
import { logAudit } from "@/server/audit";
import { labelJenis, labelMetode } from "@/lib/pbj";
import { ekstensiAsli, namaFilePegawai, namaFilePbj } from "@/lib/nama-file";
import { Readable } from "stream";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;
  // ?dl=1 = unduh eksplisit (butuh izin DOWNLOAD); tanpa itu = buka/preview (cukup VIEW)
  const unduh = new URL(req.url).searchParams.get("dl") === "1";
  const need = unduh ? "DOWNLOAD" : "VIEW";
  const needPbj = need as "DOWNLOAD" | "VIEW";

  const file = await prisma.fileObj.findUnique({
    where: { id },
    include: {
      arsipPegawai: {
        select: {
          id: true,
          nomorDokumen: true,
          namaDokumen: true,
          tanggal: true,
          createdBy: { select: { nama: true } },
          direktori: { select: { nama: true, parent: { select: { nama: true } } } },
        },
      },
      arsipPbj: {
        select: {
          id: true,
          paketKode: true,
          jenisPengadaan: true,
          metodePengadaan: true,
          taksonomiJenisDoc: { select: { namaSingkat: true } },
        },
      },
    },
  });
  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  // file harus terhubung ke arsip yang berhak diakses user
  let entitas: string | null = null;
  let entitasId: string | null = null;
  let namaUnduh: string | null = null;
  const ext = ekstensiAsli(file.fileName);
  if (file.arsipPegawai) {
    const a = file.arsipPegawai;
    const ok = await canAccessArsipPegawai(session, a.id, need);
    if (!ok) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    entitas = "ArsipPegawai";
    entitasId = a.id;
    namaUnduh = namaFilePegawai({
      uploader: a.createdBy.nama,
      parentDir: a.direktori.parent?.nama ?? null,
      dir: a.direktori.nama,
      tanggal: a.tanggal,
      nomor: a.nomorDokumen,
      namaDokumen: a.namaDokumen,
      ext,
    });
  } else if (file.arsipPbj) {
    const p = file.arsipPbj;
    const ok = await canAccessArsipPbj(session, p.id, needPbj);
    if (!ok) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    entitas = "ArsipPbj";
    entitasId = p.id;
    namaUnduh = namaFilePbj({
      kodePaket: p.paketKode,
      namaSingkat: p.taksonomiJenisDoc.namaSingkat,
      jenis: labelJenis(p.jenisPengadaan),
      metode: labelMetode(p.metodePengadaan),
      ext,
    });
  } else {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await logAudit({
    userId: session.user.id,
    aksi: unduh ? "DOWNLOAD" : "VIEW_FILE",
    entitas,
    entitasId,
    detail: { fileId: file.id, fileName: file.fileName },
  });

  const nodeStream = await readFileStream(file.storedName);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
  // nama untuk unduhan eksplisit memakai format standar; preview pakai nama asli
  const namaTampil = unduh && namaUnduh ? namaUnduh : file.fileName;
  const namaAman = encodeURIComponent(namaTampil);
  return new NextResponse(webStream, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `${unduh ? "attachment" : "inline"}; filename="${namaAman}"; filename*=UTF-8''${namaAman}`,
      "Content-Length": String(file.size),
    },
  });
}
