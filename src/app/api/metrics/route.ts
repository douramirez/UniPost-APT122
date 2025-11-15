import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Obtener métricas agrupadas por post
export async function GET() {
  try {
    const metrics = await prisma.metric.findMany({
      include: { post: { select: { title: true } } },
      orderBy: { collectedAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: metrics });
  } catch (err) {
    console.error("❌ Error GET /api/metrics:", err);
    return NextResponse.json({ ok: false, error: "LIST_FAILED" }, { status: 500 });
  }
}

// Crear o actualizar métricas (simulación)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { postId, network, likes, comments, shares, impressions } = body;

    const metric = await prisma.metric.create({
      data: {
        postId,
        network,
        likes,
        comments,
        shares,
        impressions,
      },
    });

    return NextResponse.json({ ok: true, data: metric });
  } catch (err) {
    console.error("❌ Error POST /api/metrics:", err);
    return NextResponse.json({ ok: false, error: "CREATE_FAILED" }, { status: 500 });
  }
}