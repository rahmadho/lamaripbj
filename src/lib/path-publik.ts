/**
 * Pencocokan path publik untuk `proxy.ts` — dipisah agar dapat diuji tanpa
 * memuat Auth.js/Prisma.
 */

/**
 * true bila `pathname` tepat sama dengan `base`, atau berada di bawahnya
 * (`base/...`). Sengaja TIDAK memakai `startsWith(base)` mentah agar `/login`
 * tidak membuka `/login-lain`, dan `/api/auth` tidak membuka `/api/authz`.
 */
export function diBawah(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** true bila `pathname` termasuk salah satu path publik. */
export function isPublik(pathname: string, publik: readonly string[]): boolean {
  return publik.some((p) => diBawah(pathname, p));
}
