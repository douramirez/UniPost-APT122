import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajusta si es necesario

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const metrics = await prisma.metric.findMany({
      where: {
        post: {
          authorId: user.id,
        },
      },
      include: {
        post: {
          select: {
            title: true,
            body: true, // Texto genérico (backup)
          }
        },
        Variant: {
            select: {
                date_sent: true,
                text: true // 👈 IMPORTANTE: Traemos el texto específico de la variante
            }
        }
      },
      orderBy: {
        collectedAt: 'desc',
      },
      take: 100,
    });

    return NextResponse.json({ ok: true, metrics });

  } catch (error) {
    console.error("Error fetching metrics list:", error);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}