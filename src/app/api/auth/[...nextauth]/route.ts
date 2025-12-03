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

        // 👇 Asegurarse de que el usuario tiene password
        if (!user.password) {
          return null; // o puedes lanzar un error si prefieres
        } 

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        // ⛔ Bloquear si NO está verificado
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // ✅ Adaptar el usuario de Prisma al tipo de NextAuth (id string)
        return {
          id: user.id.toString(),        // 👈 convertir number → string
          name: user.name ?? undefined,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image ?? undefined,
        } as any; // 👈 opcional, para que TS no moleste más
      },

    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },

  // Callbacks para manejar el JWT y la sesión
  callbacks: {
    async signIn({ user }) {
      const adapterUser = user as any; // o as AdapterUser si lo importas

      if (!adapterUser?.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
    }
  return true;
},

    // ✅ CAMBIO 2: Guardar la imagen en el token y soportar actualizaciones
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as any;
        (token as any).emailVerified = u.emailVerified; 
        (token as any).picture = u.image;
        token.name = u.name;
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
        (session.user as any).id = token.id;
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