import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    // Verificar si el correo ya está registrado
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "USER_EXISTS" },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashed = await bcrypt.hash(password, 10);

    // Crear usuario
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        emailVerified: null,
        roleID: 1 // <-- ¡BigInt correcto!
      },
    });

    // Generar código
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardar token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: code,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // ENVIAR CORREO
    await sendVerificationEmail(email, code);

    // ⚠️ No retornes el "user" porque contiene BigInt y rompe JSON
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en /api/register:", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
