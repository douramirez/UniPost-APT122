import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, code } = await req.json();

  // Buscar el token de verificación en la base de datos
  const token = await prisma.verificationToken.findFirst({
    where: {
      identifier: email,
      token: code,
      expires: { gt: new Date() }, // Verificar que no haya expirado
    },
  });

  if (!token) {
    return NextResponse.json({ ok: false, error: "INVALID_OR_EXPIRED" }, { status: 400 });
  }

  // Marcar al usuario como verificado
  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  // Eliminar el token de verificación después de usarlo
  await prisma.verificationToken.delete({
    where: { id: token.id },
  });

  return NextResponse.json({ ok: true, message: "Correo verificado" });
}
