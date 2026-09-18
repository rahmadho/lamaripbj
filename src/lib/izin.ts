// Daftar izin granular untuk share arsip pegawai / direktori.
// Semantik: share pada sub-direktori MENGHENTIKAN warisan induk —
// user hanya mendapat izin yang diset di entitas terdekat yang memuat share untuknya.
export const IZIN = ["VIEW", "CREATE_SUBDIR", "UPLOAD", "DOWNLOAD", "DELETE"] as const;

export type Izin = (typeof IZIN)[number];

export const IZIN_LABEL: Record<Izin, { label: string; deskripsi: string; bahaya?: boolean }> = {
  VIEW: { label: "Lihat", deskripsi: "Buka direktori & dokumen" },
  CREATE_SUBDIR: { label: "Tambah Direktori", deskripsi: "Buat subfolder di dalamnya" },
  UPLOAD: { label: "Upload", deskripsi: "Unggah arsip baru" },
  DOWNLOAD: { label: "Download", deskripsi: "Unduh berkas arsip" },
  DELETE: {
    label: "Delete",
    deskripsi: "Hapus arsip & subdirektori permanen",
    bahaya: true,
  },
};

export function isIzin(v: string): v is Izin {
  return (IZIN as readonly string[]).includes(v);
}

/** level VIEW/DOWNLOAD (untuk arsip PBJ) diterjemahkan ke izin dasar */
export function izinDariLevel(level: string): Izin[] {
  return level === "DOWNLOAD" ? ["VIEW", "DOWNLOAD"] : ["VIEW"];
}

/** level legacy utk kompatibilitas tampilan: izin tertinggi dipetakan balik */
export function levelDariIzin(izin: string[]): "VIEW" | "DOWNLOAD" {
  return izin.includes("DOWNLOAD") ? "DOWNLOAD" : "VIEW";
}

export function izinValid(arr: unknown): arr is Izin[] {
  return Array.isArray(arr) && arr.length > 0 && arr.every((v) => isIzin(v as string));
}

/** label pendek utk daftar/chip: "Lihat + Upload", dst. */
export function izinRingkas(izin: string[] | null, level: string): string {
  const list = izin && izin.length > 0 ? (izin as Izin[]) : izinDariLevel(level);
  return list.map((i) => IZIN_LABEL[i].label).join(" + ");
}
