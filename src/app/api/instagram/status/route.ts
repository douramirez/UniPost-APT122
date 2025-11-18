// src/app/api/instagram/status/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  // Comprobamos que haya sesión y email (typed por NextAuth)
  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, linked: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Buscamos el usuario en la base de datos por email
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, linked: false, error: "User not found" },
      { status: 404 }
    );
  }

  // Ahora sí usamos user.id (Int) para Instagram_Access
  const igAccount = await prisma.instagram_Access.findFirst({
    where: { userId: user.id },
  });

  if (!igAccount) {
    return NextResponse.json({ ok: true, linked: false });
  }

  return NextResponse.json({
    ok: true,
    linked: true,
    username: igAccount.usuarioRed,
  });
}