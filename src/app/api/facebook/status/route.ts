import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
// Ajusta esta importación según tu configuración real. 
// En tu archivo enviado usabas 'auth' directo, pero en anteriores usabas getServerSession.
// Si usas NextAuth v4 estándar:
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return NextResponse.json({ ok: false }, { status: 404 });

  // Buscamos acceso de Facebook (RedSocial 3)
  const fbAccess = await prisma.facebook_Access.findFirst({
    where: {
      userId: user.id,
      redSocial: 3, 
    },
  });

  if (!fbAccess) {
    return NextResponse.json({ ok: true, linked: false });
  }

  return NextResponse.json({
    ok: true,
    linked: true,
    pageName: fbAccess.usuarioRed,
  });
}