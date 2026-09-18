import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { izinDariLevel, type Izin } from "./izin";

type SessionInfo = Session | null;

type TargetKlausa = {
  userId?: string;
  grup?: { anggota: { some: { userId: string } } };
  role?: Role;
  semuaUser?: boolean;
};

const userClause = (userId: string, role: Role): TargetKlausa[] => [
  { userId },
  { role },
  { grup: { anggota: { some: { userId } } } },
  { semuaUser: true },
];

/**
 * Kumpulkan izin efektif user terhadap direktori, mengikuti aturan:
 * share pada direktori lebih spesifik (dekat) MENGHENTIKAN warisan dari induk.
 * Naik dari direktori ini ke root; berhenti di direktori pertama yang punya
 * share untuk user tersebut.
 */
async function izinEfektifDirektori(
  userId: string,
  role: Role,
  chainIds: string[]
): Promise<Izin[]> {
  for (const dirId of chainIds) {
    const shares = await prisma.shareEntry.findMany({
      where: {
        direktoriId: dirId,
        OR: userClause(userId, role),
      },
      select: { izin: true, level: true },
    });
    if (shares.length > 0) {
      const gabungan = new Set<Izin>();
      for (const s of shares) {
        const izin: Izin[] =
          s.izin.length > 0 ? (s.izin as Izin[]) : izinDariLevel(s.level);
        izin.forEach((i) => gabungan.add(i));
      }
      return [...gabungan];
    }
  }
  return [];
}

/**
 * Rantai direktori (id sendiri → root) dari record yang sudah di-query.
 * `mulaiId` dipakai bila `dir.id` tidak ikut ter-select (mis. relasi arsip).
 * Tidak melakukan query tambahan; cukup melewati relasi `parent` bertingkat.
 */
type DirNode = {
  id?: string;
  parent?: DirNode | null;
};

function chainDari(dir: DirNode | null | undefined, mulaiId?: string): string[] {
  const chain: string[] = [];
  const pertama = dir?.id ?? mulaiId;
  if (pertama) chain.push(pertama);
  let node: DirNode | null | undefined = dir?.parent;
  while (node) {
    if (node.id) chain.push(node.id);
    node = node.parent;
  }
  return chain;
}

// Select minimal untuk membangun rantai parent hingga 3 tingkat.
const parentChainSelect = {
  id: true,
  parent: {
    select: {
      id: true,
      parent: { select: { id: true, parent: { select: { id: true } } } },
    },
  },
} as const;

function punya(izin: Izin[], need: Izin): boolean {
  return izin.includes(need);
}

export async function canAccessDirektori(
  session: SessionInfo,
  direktoriId: string,
  need: Izin = "VIEW"
): Promise<boolean> {
  if (!session?.user?.id) return false;
  const uid = session.user.id;
  const role = session.user.role as Role;
  if (role === "ADMIN") return true;
  const dir = await prisma.direktori.findUnique({
    where: { id: direktoriId },
    select: { ownerId: true, ...parentChainSelect },
  });
  if (!dir) return false;
  // owner punya semua izin
  if (dir.ownerId === uid) return true;
  const chain = chainDari(dir);
  const izin = await izinEfektifDirektori(uid, role, chain);
  return punya(izin, need);
}

export async function canAccessArsipPegawai(
  session: SessionInfo,
  arsipId: string,
  need: Izin = "VIEW"
): Promise<boolean> {
  if (!session?.user?.id) return false;
  const uid = session.user.id;
  const role = session.user.role as Role;
  if (role === "ADMIN") return true;
  const arsip = await prisma.arsipPegawai.findUnique({
    where: { id: arsipId },
    select: { createdById: true, direktoriId: true, direktori: { select: parentChainSelect } },
  });
  if (!arsip) return false;
  // pembuat arsip boleh lihat & unduh, tapi bukan izin struktural
  if (arsip.createdById === uid) return need === "VIEW" || need === "DOWNLOAD";
  const chain = chainDari(arsip.direktori, arsip.direktoriId);
  const izin = await izinEfektifDirektori(uid, role, chain);
  return punya(izin, need);
}

export async function canAccessArsipPbj(
  session: SessionInfo,
  arsipId: string,
  need: "VIEW" | "DOWNLOAD" = "VIEW"
): Promise<boolean> {
  if (!session?.user?.id) return false;
  const uid = session.user.id;
  const role = session.user.role as Role;
  if (role === "ADMIN") return true;
  if (role === "PIMPINAN" && need === "VIEW") return true;
  const arsip = await prisma.arsipPbj.findUnique({
    where: { id: arsipId },
    select: { createdById: true },
  });
  if (!arsip) return false;
  if (arsip.createdById === uid) return true;
  const level = (
    await prisma.shareEntry.findMany({
      where: { arsipPbjId: arsipId, OR: userClause(uid, role) },
      select: { level: true },
    })
  ).map((e) => e.level);
  if (level.length === 0) return false;
  return level.includes("DOWNLOAD") || need === "VIEW";
}

// Filter Prisma utk query daftar: hanya arsip yang berhak dilihat.
export function arsipPbjVisibilityFilter(session: SessionInfo) {
  if (!session?.user?.id) return { id: "none" };
  const uid = session.user.id;
  const role = session.user.role as Role;
  if (role === "ADMIN" || role === "PIMPINAN") return {};
  return {
    OR: [
      { createdById: uid },
      { shares: { some: { userId: uid } } },
      { shares: { some: { role } } },
      { shares: { some: { grup: { anggota: { some: { userId: uid } } } } } },
      { shares: { some: { semuaUser: true } } },
    ],
  };
}

export function direktoriVisibilityFilter(session: SessionInfo) {
  if (!session?.user?.id) return { id: "none" };
  const uid = session.user.id;
  const role = session.user.role as Role;
  if (role === "ADMIN") return {};
  return {
    OR: [
      { ownerId: uid },
      { shares: { some: { userId: uid } } },
      { shares: { some: { role } } },
      { shares: { some: { grup: { anggota: { some: { userId: uid } } } } } },
      { shares: { some: { semuaUser: true } } },
    ],
  };
}
