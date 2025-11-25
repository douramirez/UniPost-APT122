import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

// Tipos de datos de las APIs externas
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
    // 1. Seguridad: Obtener usuario y su Organización
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, organizationId: true }
    });

    if (!user || !user.organizationId) {
        return NextResponse.json({ ok: false, error: "Usuario sin organización válida" }, { status: 400 });
    }

    const cookie = req.headers.get("cookie") ?? "";
    const baseUrl = process.env.INTERNAL_API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;

    // 2. Obtener DATOS FRESCOS de las APIs externas
    const [bskyRes, igRes] = await Promise.all([
      fetch(`${baseUrl}/api/bsky/metrics`, { headers: { cookie } }),
      fetch(`${baseUrl}/api/instagram/metrics`, { headers: { cookie } }),
    ]);

    const bskyData = await bskyRes.json();
    const igData = await igRes.json().catch(() => ({ ok: false as const, posts: [] as InstagramPostMetric[] }));

    // Listas de posts vivos en las redes
    const bskyPosts: BskyPostMetric[] = bskyData.ok ? bskyData.posts ?? [] : [];
    const igPosts: InstagramPostMetric[] = igData.ok ? igData.posts ?? [] : [];

    // 3. Crear MAPAS para búsqueda rápida (Eficiencia O(1))
    // Clave: URI o ID -> Valor: Objeto de métricas
    const bskyMap = new Map(bskyPosts.map(p => [p.uri, p]));
    const igMap = new Map(igPosts.map(p => [p.id, p]));

    // 4. Obtener TODAS las variantes publicadas de NUESTRA BASE DE DATOS
    const localVariants = await prisma.variant.findMany({
        where: {
            status: "PUBLISHED",
            uri: { not: null }, // Solo las que tienen un ID externo
            post: {
                organizationId: user.organizationId // Solo de mi organización
            }
        },
        include: {
            Metric: true // Incluimos la métrica actual si existe
        }
    });

    let updatedCount = 0;
    let deletedCount = 0;

    // 5. Comparar y Sincronizar (Update o Delete)
    for (const variant of localVariants) {
        if (!variant.uri) continue;

        let remoteData: any = null;
        let likes = 0, comments = 0, shares = 0, impressions = 0;

        // A. Buscar en el Mapa correspondiente
        if (variant.network === "BLUESKY") {
            remoteData = bskyMap.get(variant.uri);
            if (remoteData) {
                const d = remoteData as BskyPostMetric;
                likes = d.likes; comments = d.replies; shares = d.reposts + d.quotes; impressions = d.views ?? 0;
            }
        } else if (variant.network === "INSTAGRAM") {
            remoteData = igMap.get(variant.uri);
            if (remoteData) {
                const d = remoteData as InstagramPostMetric;
                likes = d.likeCount; comments = d.commentsCount; shares = d.shares; impressions = d.views ?? 0;
            }
        }

        // B. Tomar decisión
        if (remoteData) {
            // ✅ EXISTE EN LA RED -> Actualizar o Crear Métrica
            if (variant.Metric.length > 0) {
                // Actualizar existente
                await prisma.metric.update({
                    where: { id: variant.Metric[0].id },
                    data: { likes, comments, shares, impressions, collectedAt: new Date() }
                });
            } else {
                // Crear nueva si faltaba
                await prisma.metric.create({
                    data: {
                        postId: variant.postId,
                        variantId: variant.id,
                        network: variant.network,
                        likes, comments, shares, impressions, collectedAt: new Date()
                    }
                });
            }
            updatedCount++;
        } else {
            // ❌ NO EXISTE EN LA RED (Fue eliminado) -> Borrar Métrica Local
            if (variant.Metric.length > 0) {
                // Borramos la métrica para que no sume en los reportes
                await prisma.metric.delete({
                    where: { id: variant.Metric[0].id }
                });
                
                // Opcional: Cambiar estado de la variante a "DELETED" para saber que pasó
                await prisma.variant.update({
                    where: { id: variant.id },
                    data: { status: "DELETED_ON_PLATFORM" }
                });
                
                deletedCount++;
            }
        }
    }

    return NextResponse.json({ 
        ok: true, 
        processed: updatedCount + deletedCount, 
        updated: updatedCount,
        deleted: deletedCount 
    });

  } catch (err: any) {
    console.error("Error en /api/metrics/refresh:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error inesperado al actualizar métricas",
      },
      { status: 500 }
    );
  }
}