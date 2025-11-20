import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email } = await req.json();

  // Verificar si el correo está verificado en la base de datos
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
  }

  const isVerified = user.emailVerified !== null; // Verificar si está verificado

  return NextResponse.json({ ok: true, isVerified });
}
