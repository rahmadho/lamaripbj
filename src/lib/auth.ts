import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { cekRateLimit, resetRateLimit } from "@/lib/rate-limit";

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
        const limit = cekRateLimit(`login:${ip}:${email}`);
        if (!limit.ok) {
          throw new Error(
            `Terlalu banyak percobaan login. Coba lagi dalam ${limit.detikTunggu} detik.`
          );
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.aktif) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        resetRateLimit(`login:${ip}:${email}`);
        return { id: user.id, name: user.nama, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id ?? "" },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "STAFF";
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
