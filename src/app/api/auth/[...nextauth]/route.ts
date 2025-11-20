// app/api/auth/[...nextauth]/route.ts

import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

// Exportamos configuración para poder reutilizarlo despues con getServerSession
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
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        return valid ? user : null;
        }
      }
    ),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
};

// NextAuth handler usando las opciones de arriba
const handler = NextAuth(authOptions);

// Necesario para App Router (GET/POST)
export { handler as GET, handler as POST };
