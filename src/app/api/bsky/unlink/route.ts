import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email ?? "" },
  });

  if (!user) return Response.json({ ok: false, error: "User not found" });

  await prisma.blueSky_Access.deleteMany({
    where: { usuarioId: user.id },
  });

  return Response.json({ ok: true });
}