import "server-only";
import { prisma } from "@/lib/db";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";

export type FolderNode = {
  id: string;
  nama: string;
  parentId: string | null;
  bolehUpload: boolean;
  children: FolderNode[];
};

const visibleDirektoriFilter = (uid: string, role: Role) =>
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

// Semua direktori yang terlihat user, dibentuk jadi tree.
export async function getDirektoriTree(session: Session): Promise<FolderNode[]> {
  const uid = session.user.id;
  const role = session.user.role as Role;
  const all = await prisma.direktori.findMany({
    where: visibleDirektoriFilter(uid, role),
    select: { id: true, nama: true, parentId: true, bolehUpload: true },
    orderBy: { nama: "asc" },
  });

  const byId = new Map<string, FolderNode>();
  for (const d of all) byId.set(d.id, { ...d, children: [] });
  const roots: FolderNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function getDirektori(id: string) {
  return prisma.direktori.findUnique({
    where: { id },
    include: {
      owner: { select: { nama: true, email: true } },
      parent: { select: { id: true, nama: true } },
      _count: { select: { children: true, arsip: true } },
      shares: {
        include: {
          user: { select: { nama: true } },
          grup: { select: { nama: true } },
        },
      },
    },
  });
}

export async function getBreadcrumb(id: string) {
  const crumbs: { id: string; nama: string }[] = [];
  let current: string | null = id;
  for (let i = 0; i < 20 && current; i++) {
    const dirId: string = current;
    const dir = await prisma.direktori.findUnique({
      where: { id: dirId },
      select: { id: true, nama: true, parentId: true },
    });
    if (!dir) break;
    crumbs.unshift({ id: dir.id, nama: dir.nama });
    current = dir.parentId;
  }
  return crumbs;
}

/**
 * Anak-anak langsung sebuah direktori — hanya yang terlihat oleh user
 * (filter visibility sama dengan tree): pemilik, ADMIN, atau ada share
 * untuk user/role/grup/semuaUser. Untuk pemilik/admin, subfolder induk
 * otomatis terlihat semua.
 */
export async function getAnakDirektori(
  session: Session,
  parentId: string | null
) {
  const uid = session.user.id;
  const role = session.user.role as Role;
  return prisma.direktori.findMany({
    where: { AND: [{ parentId }, visibleDirektoriFilter(uid, role)] },
    select: {
      id: true,
      nama: true,
      bolehUpload: true,
      updatedAt: true,
      _count: { select: { children: true, arsip: true } },
    },
    orderBy: { nama: "asc" },
  });
}

export async function getArsipDiDirektori(direktoriId: string) {
  return prisma.arsipPegawai.findMany({
    where: { direktoriId },
    include: { file: true, createdBy: { select: { nama: true } } },
    orderBy: { tanggal: "desc" },
  });
}

export async function getRootDirektori() {
  return prisma.direktori.findMany({
    where: { parentId: null },
    orderBy: { nama: "asc" },
  });
}

// Cek apakah user boleh upload di direktori tertentu.
// bolehUpload=false → tolak. uploadRoles kosong → ikut akses direktori (owner/admin).
export async function canUploadTo(
  session: Session,
  direktoriId: string
): Promise<boolean> {
  const uid = session.user.id;
  const role = session.user.role as Role;
  if (role === "ADMIN") return true;
  const dir = await prisma.direktori.findUnique({
    where: { id: direktoriId },
    select: { bolehUpload: true, uploadRoles: true, ownerId: true },
  });
  if (!dir || !dir.bolehUpload) return false;
  if (dir.ownerId === uid) return true;
  if (dir.uploadRoles.length > 0) return dir.uploadRoles.includes(role);
  // tanpa batasan role: hanya pemilik & yang punya izin share UPLOAD eksplisit
  // (cek via ACL granular di pemanggil — di sini cukup tolak)
  return false;
}
