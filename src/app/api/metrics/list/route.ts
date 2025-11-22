import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // 1. Obtener el usuario para saber su organizationId
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { organizationId: true },
  });

  if (!user || !user.organizationId) {
    return NextResponse.json({ ok: false, error: "User or Org not found" }, { status: 404 });
  }

  try {
    // 2. Buscar métricas en la BD
    // Filtramos donde la Variante -> Post -> Organization coincida con el usuario
    const metrics = await prisma.metric.findMany({
      where: {
        post: {
          organizationId: user.organizationId,
        },
      },
      include: {
        // Incluimos la variante para saber la red social
        Variant: true, 
        // Incluimos el post para saber el título/cuerpo
        post: true, 
      },
      orderBy: {
        collectedAt: 'desc', // Las más recientes primero
      },
    });

    return NextResponse.json({ ok: true, metrics });
  } catch (error) {
    console.error("Error fetching metrics from DB:", error);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}