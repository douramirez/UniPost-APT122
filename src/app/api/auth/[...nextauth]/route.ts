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

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        // ⛔ Bloquear si NO está verificado
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED"); // Aquí se lanza el error
        }

        return user;
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },

  // Callbacks para manejar el JWT y la sesión
  callbacks: {
    async signIn({ user }) {
      if (!user?.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.emailVerified = user.emailVerified;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
