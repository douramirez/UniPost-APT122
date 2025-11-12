import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email ?? "" },
  });

  if (!user) return Response.json({ ok: false, error: "User not found" });

  const access = await prisma.blueSky_Access.findFirst({
    where: { usuarioId: user.id },
  });

  if (!access) {
    return Response.json({ ok: true, linked: false });
  }

  return Response.json({
    ok: true,
    linked: true,
    nombreUsuario: access.nombreUsuario,
  });
}