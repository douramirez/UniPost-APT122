import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
// import { authOptions } from ...

type RemoteMetric = {
  id: string;       
  permalink?: string; 
  likes: number;
  comments: number;
  shares: number;
  views: number;
  createdAt?: string | Date; // 👈 NUEVO: Fecha real de publicación
};

// Helper: Limpia URLs
function normalizeUrl(url?: string | null) {
    if (!url) return "";
    try {
        if (!url.includes("http")) return url.trim();
        const urlObj = new URL(url);
        const host = urlObj.hostname.replace(/^www\./, "");
        return (host + urlObj.pathname).replace(/\/$/, "");
    } catch {
        return url.trim().replace(/\/$/, "");
    }
}

// Helper: Extraer Shortcode
function getIGShortcode(url?: string | null) {
    if (!url) return null;
    try {
        const match = url.match(/\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({ 
        where: { email: session.user.email },
        select: { id: true, organizationId: true } 
    });

    if (!user) return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 400 });

    const cookie = req.headers.get("cookie") ?? "";
    const baseUrl = process.env.INTERNAL_API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;

    console.log(`🔄 Refresh: Usuario ID ${user.id}. Solicitando datos...`);

    // 1. Descargar datos
    const [bskyRes, igRes, fbRes] = await Promise.all([
        fetch(`${baseUrl}/api/bsky/metrics`, { headers: { cookie } }),
        fetch(`${baseUrl}/api/instagram/metrics`, { headers: { cookie } }),
        fetch(`${baseUrl}/api/facebook/metrics`, { headers: { cookie } }),
    ]);

    const bskyData = await bskyRes.json();
    const igData = await igRes.json();
    const fbData = await fbRes.json();

    // 2. Construir Mapas
    const bskyMap = new Map<string, RemoteMetric>();
    const igMap = new Map<string, RemoteMetric>(); 
    const fbMap = new Map<string, RemoteMetric>();

    // --- BLUESKY ---
    if (bskyData.ok) {
        bskyData.posts?.forEach((p: any) => {
            bskyMap.set(p.uri, { 
                id: p.uri, 
                likes: p.likes, 
                comments: p.comments, 
                shares: p.shares, 
                views: p.views,
                createdAt: p.createdAt // Bluesky suele enviar esto
            });
        });
    }
    
    // --- INSTAGRAM ---
    if (igData.ok) {
        igData.posts?.forEach((p: any) => {
            const m: RemoteMetric = { 
                id: p.id, 
                permalink: p.permalink, 
                likes: p.likes, 
                comments: p.comments, 
                shares: 0, 
                views: 0,
                createdAt: p.createdAt // 👈 Aquí capturamos la fecha que envía tu archivo
            };
            
            igMap.set(p.id, m);
            const shortcode = getIGShortcode(p.permalink);
            if (shortcode) igMap.set(shortcode, m);
        });
    }

    // --- FACEBOOK ---
    if (fbData.ok) {
        fbData.posts?.forEach((p: any) => {
            const m: RemoteMetric = { 
                id: p.id, 
                likes: p.likes, 
                comments: p.comments, 
                shares: p.shares, 
                views: 0,
                createdAt: p.createdAt // Facebook también la envía
            };
            fbMap.set(p.id, m);
            if (p.id.includes("_")) fbMap.set(p.id.split("_")[1], m);
        });
    }

    // 3. Obtener Variantes
    const variants = await prisma.variant.findMany({
        where: {
            OR: [ { uri: { not: null } }, { permalink: { not: null } } ],
            post: { authorId: user.id }
        },
        include: { Metric: true }
    });

    let updated = 0;

    // 4. Matching y Actualización
    for (const v of variants) {
        let remote: RemoteMetric | undefined;

        // Estrategias de Búsqueda
        if (v.network === "BLUESKY" && v.uri) remote = bskyMap.get(v.uri);
        else if (v.network === "INSTAGRAM") {
            if (v.uri) remote = igMap.get(v.uri);
            if (!remote && v.permalink) {
                const sc = getIGShortcode(v.permalink);
                if (sc) remote = igMap.get(sc);
            }
        } 
        else if (v.network === "FACEBOOK" && v.uri) {
            remote = fbMap.get(v.uri);
            if (!remote) {
                for (const [key, val] of fbMap.entries()) {
                    if (key.includes(v.uri) || v.uri.includes(key)) { remote = val; break; }
                }
            }
        }

        if (remote) {
            // Datos de métrica
            const payload = {
                likes: remote.likes,
                comments: remote.comments,
                shares: remote.shares,
                impressions: remote.views || 0,
                collectedAt: new Date()
            };

            // 🕒 ACTUALIZAR FECHA DE PUBLICACIÓN Y ESTADO
            // Si la API trae fecha, actualizamos la variante para corregir datos antiguos
            const updateData: any = { status: "PUBLISHED" };
            if (remote.createdAt) {
                updateData.date_sent = new Date(remote.createdAt);
                // time_sent es Time en prisma, puede requerir formato específico o usarse date_sent para todo
            }

            await prisma.variant.update({ 
                where: { id: v.id }, 
                data: updateData
            });

            // Actualizar/Crear Métrica
            if (v.Metric.length > 0) {
                await prisma.metric.update({ where: { id: v.Metric[0].id }, data: payload });
            } else {
                await prisma.metric.create({
                    data: { ...payload, variantId: v.id, postId: v.postId, network: v.network }
                });
            }
            updated++;
        }
    }

    return NextResponse.json({ ok: true, processed: updated });

  } catch (e: any) {
    console.error("Fatal Error Refresh:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}