import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { cekRateLimit, resetRateLimit, MAX_ATTEMPTS_IP } from "@/lib/rate-limit";

async function ambilIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return h.get("x-real-ip") ?? "lokal";
  } catch {
    return "lokal";
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = creds?.email?.toString().trim().toLowerCase();
        const password = creds?.password?.toString();
        if (!email || !password) return null;

        const ip = await ambilIp();
        // Dua bucket: per-IP (batas lintas akun, anti credential-stuffing) dan
        // per-IP+email (batas per akun). Cek keduanya.
        const limitIp = cekRateLimit(`login-ip:${ip}`, MAX_ATTEMPTS_IP);
        const limit = cekRateLimit(`login:${ip}:${email}`);
        if (!limit.ok || !limitIp.ok) {
          const detik = Math.max(limit.detikTunggu, limitIp.detikTunggu);
          throw new Error(
            `Terlalu banyak percobaan login. Coba lagi dalam ${detik} detik.`
          );
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.aktif) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        resetRateLimit(`login:${ip}:${email}`);
        resetRateLimit(`login-ip:${ip}`);
        return { id: user.id, name: user.nama, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.uid = user.id;
      }
      // Refresh ringan: muat role dari DB saat login ATAU saat sesi di-refresh,
      // supaya perubahan role / penonaktifan user berlaku tanpa menunggu logout.
      if (user || trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: (user?.id ?? token.uid) as string },
          select: { role: true, aktif: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.aktif = dbUser.aktif;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
      }
      // Tolak sesi user yang sudah dinonaktifkan.
      if (token.aktif === false) {
        return { ...session, expires: new Date(0).toISOString() };
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
