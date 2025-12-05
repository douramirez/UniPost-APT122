// /app/api/auth/[...nextauth]/route.ts

import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        if (!user.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // 👇 DEVOLVER ID COMO STRING PARA NEXTAUTH
        return {
          id: user.id.toString(),
          name: user.name ?? undefined,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image ?? undefined,
        } as any;
      },
    }),
  ],

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },

  callbacks: {
    // 🔒 Verificación del login
    async signIn({ user }) {
      const adapterUser = user as any;
      if (!adapterUser?.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }
      return true;
    },

    // 🟣 JWT CALLBACK — AQUÍ SE GUARDA EL ID
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as any;

        token.id = u.id; // ⭐ NECESARIO PARA session.user.id
        (token as any).emailVerified = u.emailVerified;
        (token as any).picture = u.image;
        token.name = u.name;
      }

      // Permitir updates desde el perfil
      if (trigger === "update" && session) {
        token.name = session.user.name;
        token.picture = session.user.image;
      }

      return token;
    },

    // 🟣 SESSION CALLBACK — PASA EL ID AL CLIENTE
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id; // ⭐ YA DISPONIBLE EN EL CLIENTE
        (session.user as any).emailVerified = (token as any).emailVerified;
        session.user.image = (token as any).picture;
        session.user.name = token.name;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
