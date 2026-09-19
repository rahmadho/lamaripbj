import "server-only";
import { prisma } from "@/lib/db";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";

export async function getSemuaGrup() {
  return prisma.grup.findMany({
    include: {
      anggota: {
        include: { user: { select: { id: true, nama: true, email: true, role: true } } },
      },
      _count: { select: { shares: true } },
    },
    orderBy: { nama: "asc" },
  });
}

// Kandidat anggota grup: diutamakan Pejabat Fungsional
export async function getKandidatAnggotaGrup() {
  return prisma.user.findMany({
    where: { aktif: true, role: "PEJABAT_FUNGSIONAL" },
    select: { id: true, nama: true, username: true, email: true },
    orderBy: { nama: "asc" },
  });
}

export async function getSemuaMenu() {
  return prisma.menuItem.findMany({ orderBy: [{ urutan: "asc" }, { label: "asc" }] });
}

// Arsip (pegawai & PBJ) yang dibagikan ke user (langsung / via role / via grup).
// ADMIN tetap melihat SEMUA arsip — baik yang di-share maupun tidak.
export async function getDibagikanKeSaya(session: Session) {
  const uid = session.user.id;
  const role = session.user.role as Role;

  if (role === "ADMIN") {
    const [semuaDir, semuaArsipPegawai, semuaPbj] = await Promise.all([
      prisma.direktori.findMany({ select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
      prisma.arsipPegawai.findMany({
        select: {
          id: true,
          nomorDokumen: true,
          namaDokumen: true,
          tanggal: true,
          direktori: { select: { id: true, nama: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.arsipPbj.findMany({
        select: {
          id: true,
          paketKode: true,
          paketNama: true,
          taksonomiJenisDoc: { select: { nama: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return {
      direktori: semuaDir.map((d) => ({ ...d, level: "DOWNLOAD" as const, izin: [] as string[] })),
      arsipPegawai: semuaArsipPegawai.map((a) => ({
        ...a,
        level: "DOWNLOAD" as const,
        izin: [] as string[],
      })),
      arsipPbj: semuaPbj.map((a) => ({
        ...a,
        level: "DOWNLOAD" as const,
        izin: [] as string[],
      })),
    };
  }

  const orTarget = [
    { userId: uid },
    { role },
    { grup: { anggota: { some: { userId: uid } } } },
  ];

  const [dirShares, arsipShares, pbjShares] = await Promise.all([
    prisma.shareEntry.findMany({
      where: { OR: orTarget, direktoriId: { not: null } },
      include: { direktori: { select: { id: true, nama: true } } },
    }),
    prisma.shareEntry.findMany({
      where: { OR: orTarget, arsipPegawaiId: { not: null } },
      include: {
        arsipPegawai: {
          select: {
            id: true,
            nomorDokumen: true,
            namaDokumen: true,
            tanggal: true,
            direktori: { select: { id: true, nama: true } },
          },
        },
      },
    }),
    prisma.shareEntry.findMany({
      where: { OR: orTarget, arsipPbjId: { not: null } },
      include: {
        arsipPbj: {
          select: {
            id: true,
            paketKode: true,
            paketNama: true,
            taksonomiJenisDoc: { select: { nama: true } },
          },
        },
      },
    }),
  ]);

  return {
    direktori: dirShares
      .filter((s) => s.direktori)
      .map((s) => ({ id: s.direktori!.id, nama: s.direktori!.nama, level: s.level, izin: s.izin })),
    arsipPegawai: arsipShares
      .filter((s) => s.arsipPegawai)
      .map((s) => ({ ...s.arsipPegawai!, level: s.level, izin: s.izin })),
    arsipPbj: pbjShares
      .filter((s) => s.arsipPbj)
      .map((s) => ({ ...s.arsipPbj!, level: s.level, izin: s.izin })),
  };
}
