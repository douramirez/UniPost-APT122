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
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // ✅ CAMBIO 1: Retornar explícitamente los datos, incluyendo la imagen
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image, // 👈 Importante: Pasar la imagen de la BD al flujo
        };
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

    // ✅ CAMBIO 2: Guardar la imagen en el token y soportar actualizaciones
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.emailVerified = user.emailVerified;
        token.picture = user.image; // 👈 Guardamos la imagen en el token
        token.name = user.name;
      }

      // Si se dispara "update" desde el cliente (perfil), actualizamos el token
      if (trigger === "update" && session) {
        token.name = session.user.name;
        token.picture = session.user.image;
      }

      return token;
    },

    // ✅ CAMBIO 3: Pasar la imagen del token a la sesión final
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as number;
        session.user.emailVerified = token.emailVerified;
        session.user.image = token.picture;
        session.user.name = token.name;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };