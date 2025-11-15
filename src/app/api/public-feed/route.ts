import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const variants = await prisma.variant.findMany({
      where: {
        status: "PUBLISHED",
        uri: { not: null },
      },
      orderBy: { id: "desc" },
      take: 50,
      include: {
        post: {
          select: {
            title: true,
            body: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: variants });
  } catch (err) {
    console.error("❌ Error GET /api/public-feed:", err);
    return NextResponse.json(
      { ok: false, error: "FEED_FAILED" },
      { status: 500 }
    );
  }
}