import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type BskyPostMetric = {
  uri: string;
  text: string;
  createdAt: string | null;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  views: number | null;
  postTitle?: string;
};

type InstagramPostMetric = {
  id: string;
  caption: string | null;
  likeCount: number;
  commentsCount: number;
  shares: number;
  views: number | null;
  createdAt: string | null;
  postTitle?: string;
};

export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get("cookie") ?? "";

    const baseUrl =
      process.env.INTERNAL_API_BASE_URL ||
      `http://127.0.0.1:${process.env.PORT || 3000}`;

    // 1) Obtener métricas de las APIs
    const [bskyRes, igRes] = await Promise.all([
      fetch(`${baseUrl}/api/bsky/metrics`, {
        headers: { cookie },
      }),
      fetch(`${baseUrl}/api/instagram/metrics`, {
        headers: { cookie },
      }),
    ]);

    const bskyData = await bskyRes.json();
    const igData = await igRes
      .json()
      .catch(() => ({ ok: false as const, posts: [] as InstagramPostMetric[] }));

    if (!bskyData.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: bskyData.error || "Error al obtener métricas de Bluesky",
        },
        { status: 500 }
      );
    }

    const bskyPosts: BskyPostMetric[] = bskyData.posts ?? [];
    const igPosts: InstagramPostMetric[] = igData.ok ? igData.posts ?? [] : [];

    let updatedOrInserted = 0;

    // ---------------------------------------------------------
    // 2) BLUESKY
    // ---------------------------------------------------------
    for (const p of bskyPosts) {
      // Buscar la variante asociada a este post (usando la URI)
      const variant = await prisma.variant.findFirst({
        where: {
          network: "BLUESKY",
          uri: p.uri, 
        },
      });

      if (!variant) continue;

      // 🔍 LÓGICA DE ACTUALIZACIÓN:
      // Buscamos si ya existe una métrica para esta variante.
      const existingMetric = await prisma.metric.findFirst({
        where: { variantId: variant.id },
      });

      if (existingMetric) {
        // ✅ Si existe, ACTUALIZAMOS (Update)
        await prisma.metric.update({
          where: { id: existingMetric.id },
          data: {
            likes: p.likes,
            comments: p.replies,
            shares: p.reposts + p.quotes,
            impressions: p.views ?? 0,
            collectedAt: new Date(), // Actualizamos la fecha de recolección
          },
        });
      } else {
        // 🆕 Si no existe, CREAMOS (Create)
        await prisma.metric.create({
          data: {
            postId: variant.postId,
            variantId: variant.id,
            network: "BLUESKY",
            likes: p.likes,
            comments: p.replies,
            shares: p.reposts + p.quotes,
            impressions: p.views ?? 0,
            collectedAt: new Date(),
          },
        });
      }
      updatedOrInserted++;
    }

    // ---------------------------------------------------------
    // 3) INSTAGRAM
    // ---------------------------------------------------------
    for (const p of igPosts) {
      // Buscar la variante (asegúrate que 'uri' o 'permalink' coincidan con p.id)
      const variant = await prisma.variant.findFirst({
        where: {
          network: "INSTAGRAM",
          // ⚠️ IMPORTANTE: Ajusta esto según cómo guardaste la referencia en tu tabla Variant.
          // Si en Variant guardaste el ID de IG en el campo 'uri':
          uri: p.id, 
        },
      });

      if (!variant) continue;

      // 🔍 LÓGICA DE ACTUALIZACIÓN:
      const existingMetric = await prisma.metric.findFirst({
        where: { variantId: variant.id },
      });

      if (existingMetric) {
        // ✅ ACTUALIZAR
        await prisma.metric.update({
          where: { id: existingMetric.id },
          data: {
            likes: p.likeCount,
            comments: p.commentsCount,
            shares: p.shares,
            impressions: p.views ?? 0,
            collectedAt: new Date(),
          },
        });
      } else {
        // 🆕 CREAR
        await prisma.metric.create({
          data: {
            postId: variant.postId,
            variantId: variant.id,
            network: "INSTAGRAM",
            likes: p.likeCount,
            comments: p.commentsCount,
            shares: p.shares,
            impressions: p.views ?? 0,
            collectedAt: new Date(),
          },
        });
      }
      updatedOrInserted++;
    }

    return NextResponse.json({ ok: true, processed: updatedOrInserted });
  } catch (err: any) {
    console.error("Error en /api/metrics/refresh:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Error inesperado al actualizar métricas",
      },
      { status: 500 }
    );
  }
}