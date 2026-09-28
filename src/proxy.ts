import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isPublik } from "@/lib/path-publik";

const PUBLIC_PATHS = ["/login", "/panduan", "/hubungi-kami", "/api/auth"];

export default async function proxy(req: Request) {
  const { pathname } = new URL(req.url);
  // Boundary eksplisit: `/login` TIDAK boleh membuka `/login-lain`; `/api/auth`
  // TIDAK boleh membuka `/api/authz`. Pakai pencocokan segmen, bukan prefix mentah.
  if (isPublik(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }
  const session = await auth();
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
