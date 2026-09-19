import { z } from "zod";

export const RoleEnum = z.enum([
  "ADMIN",
  "PIMPINAN",
  "PEJABAT_FUNGSIONAL",
  "STAFF",
  "UPLOADER",
]);

export const PermissionEnum = z.enum(["VIEW", "DOWNLOAD"]);

export const direktoriSchema = z.object({
  nama: z.string().min(1, "Nama direktori wajib diisi").max(200),
  deskripsi: z.string().max(1000).optional().or(z.literal("")),
  parentId: z.string().nullable().optional(),
  bolehUpload: z.boolean().default(true),
  uploadRoles: z.array(RoleEnum).default([]),
});

export const arsipPegawaiSchema = z.object({
  direktoriId: z.string().min(1),
  nomorDokumen: z.string().min(1, "Nomor dokumen wajib diisi").max(200),
  namaDokumen: z.string().min(1, "Nama dokumen wajib diisi").max(300),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
});

export const shareSchema = z
  .object({
    level: PermissionEnum.optional(),
    izin: z.array(z.string()).optional(),
    // target tunggal (kompatibilitas) & majemuk (multi-pilih)
    userId: z.string().optional(),
    userIds: z.array(z.string()).optional(),
    grupId: z.string().optional(),
    grupIds: z.array(z.string()).optional(),
    role: RoleEnum.optional(),
    roles: z.array(RoleEnum).optional(),
    semuaUser: z.boolean().optional().default(false),
    direktoriId: z.string().optional(),
    arsipPegawaiId: z.string().optional(),
    arsipPbjId: z.string().optional(),
  })
  .refine(
    (v) => v.direktoriId || v.arsipPegawaiId || v.arsipPbjId,
    "Subjek share wajib diisi"
  )
  .refine(
    (v) => {
      const adaGrup = !!v.grupId || (v.grupIds?.length ?? 0) > 0;
      const adaUser = !!v.userId || (v.userIds?.length ?? 0) > 0;
      if (v.arsipPbjId) {
        // PBJ: boleh ke grup dan/atau perorangan (multi-pilih); bukan role/semuaUser
        return !v.role && !(v.roles?.length) && !v.semuaUser && (adaGrup || adaUser);
      }
      // non-PBJ: boleh user/role/semuaUser, bukan grup
      return !adaGrup;
    },
    "Arsip PBJ dapat dibagikan ke grup dan/atau perorangan; grup hanya berlaku untuk arsip PBJ"
  )
  .refine(
    (v) => {
      // PBJ boleh kombinasi grup + perorangan sekaligus (Fase 25).
      if (v.arsipPbjId) {
        const adaGrup = !!v.grupId || (v.grupIds?.length ?? 0) > 0;
        const adaUser = !!v.userId || (v.userIds?.length ?? 0) > 0;
        return adaGrup || adaUser;
      }
      // non-PBJ: tepat satu jenis penerima
      return (
        [
          v.userId,
          v.grupId,
          v.role,
          v.semuaUser ? "semua" : undefined,
          (v.userIds?.length ?? 0) > 0 ? "u" : undefined,
          (v.grupIds?.length ?? 0) > 0 ? "g" : undefined,
          (v.roles?.length ?? 0) > 0 ? "r" : undefined,
        ].filter(Boolean).length === 1
      );
    },
    "Pilih penerima dengan benar (PBJ: grup dan/atau perorangan)"
  )
  .refine(
    (v) => {
      if (v.arsipPbjId) return true; // PBJ tetap level VIEW/DOWNLOAD
      return (v.izin ?? []).length > 0;
    },
    "Pilih minimal satu izin"
  );

export type DirektoriInput = z.infer<typeof direktoriSchema>;
export type ArsipPegawaiInput = z.infer<typeof arsipPegawaiSchema>;
export type ShareInput = z.infer<typeof shareSchema>;
