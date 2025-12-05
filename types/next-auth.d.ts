import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string | number;
  }

  interface Session {
    user: {
      id: string | number;
    } & DefaultSession["user"];
  }

  interface JWT {
    id: string | number;
  }
}
