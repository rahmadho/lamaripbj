import "server-only";
import { prisma } from "@/lib/db";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";

export type HasilCari = {
  arsipPegawai: {
    id: string;
    nomorDokumen: string;
    namaDokumen: string;
    direktoriId: string;
    direktoriNama: string;
    tanggal: Date;
  }[];
  arsipPbj: {
    id: string;
    paketKode: string;
    paketNama: string;
    jenisDoc: string;
    tahun: number;
  }[];
};

const dirVisible = (uid: string, role: Role) =>
  role === "ADMIN"
    ? {}
    : {
        OR: [
          { ownerId: uid },
          { shares: { some: { userId: uid } } },
          { shares: { some: { role } } },
          { shares: { some: { grup: { anggota: { some: { userId: uid } } } } } },
          { shares: { some: { semuaUser: true } } },
        ],
      };

export async function cariArsip(session: Session, q: string): Promise<HasilCari> {
  const uid = session.user.id;
  const role = session.user.role as Role;
  const term = q.trim();
  if (term.length < 2) return { arsipPegawai: [], arsipPbj: [] };

  const [pegawai, pbj] = await Promise.all([
    prisma.arsipPegawai.findMany({
      where: {
        AND: [
          { direktori: dirVisible(uid, role) },
          {
            OR: [
              { nomorDokumen: { contains: term, mode: "insensitive" } },
              { namaDokumen: { contains: term, mode: "insensitive" } },
            ],
          },
        ],
      },
      include: { direktori: { select: { id: true, nama: true } } },
      orderBy: { tanggal: "desc" },
      take: 50,
    }),
    prisma.arsipPbj.findMany({
      where: {
        AND: [
          role === "ADMIN" || role === "PIMPINAN"
            ? {}
            : {
                OR: [
                  { createdById: uid },
                  { shares: { some: { userId: uid } } },
                  { shares: { some: { role } } },
                  { shares: { some: { grup: { anggota: { some: { userId: uid } } } } } },
                  { shares: { some: { semuaUser: true } } },
                ],
              },
          {
            OR: [
              { paketKode: { contains: term, mode: "insensitive" } },
              { paketNama: { contains: term, mode: "insensitive" } },
              { keterangan: { contains: term, mode: "insensitive" } },
              { taksonomiJenisDoc: { nama: { contains: term, mode: "insensitive" } } },
            ],
          },
        ],
      },
      include: { taksonomiJenisDoc: { select: { nama: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    arsipPegawai: pegawai.map((p) => ({
      id: p.id,
      nomorDokumen: p.nomorDokumen,
      namaDokumen: p.namaDokumen,
      direktoriId: p.direktori.id,
      direktoriNama: p.direktori.nama,
      tanggal: p.tanggal,
    })),
    arsipPbj: pbj.map((p) => ({
      id: p.id,
      paketKode: p.paketKode,
      paketNama: p.paketNama,
      jenisDoc: p.taksonomiJenisDoc.nama,
      tahun: p.tahun,
    })),
  };
}
