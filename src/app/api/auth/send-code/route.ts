import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer"; // Asegúrate de tener esta función

export async function POST(req: Request) {
  const { email } = await req.json();

  // Verificar si el correo existe en la base de datos
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
  }

  // Generar el código de verificación (6 dígitos)
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Guardar el código en la base de datos con fecha de expiración
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: code,
      expires: new Date(Date.now() + 10 * 60 * 1000), // El código expira en 10 minutos
    },
  });

  // Enviar el código de verificación al correo del usuario usando Resend
  await sendVerificationEmail(email, code);

  return NextResponse.json({ ok: true, message: "Código enviado" });
}
