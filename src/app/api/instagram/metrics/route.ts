import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

const GRAPH_BASE_URL = "https://graph.facebook.com/v21.0";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    // 1. Obtener Credenciales de INSTAGRAM (RedSocial 2)
    const igAccess = await prisma.instagram_Access.findFirst({
      where: { userId: user.id, redSocial: 2 },
    });

    if (!igAccess || !igAccess.accessToken) {
      return NextResponse.json({ ok: false, error: "Instagram no conectado" }, { status: 400 });
    }

    // 🔐 Desencriptar
    const userToken = decrypt(igAccess.accessToken);

    // 2. Obtener la cuenta de Instagram Business
    // A diferencia de FB, aquí necesitamos el ID específico de "instagram_business_account"
    const accountsRes = await fetch(
      `${GRAPH_BASE_URL}/me/accounts?fields=name,access_token,instagram_business_account{id}&access_token=${userToken}`
    );
    const accounts = await accountsRes.json();

    // Buscamos la página que tenga el campo instagram_business_account lleno
    const pageWithIg = accounts.data?.find((p: any) => p.instagram_business_account?.id);

    if (!pageWithIg) {
      return NextResponse.json({ ok: false, error: "No se encontró cuenta de Instagram Business vinculada." });
    }

    const igUserId = pageWithIg.instagram_business_account.id;
    const pageAccessToken = pageWithIg.access_token; // Usamos el token de la página para más permisos

    // 3. Obtener Feed de Instagram (MEDIA)
    // ⚠️ CAMBIO IMPORTANTE: Pedimos 'permalink' explícitamente
    const fields = "id,caption,permalink,timestamp,like_count,comments_count,media_type,media_product_type";
    const mediaUrl = `${GRAPH_BASE_URL}/${igUserId}/media?fields=${fields}&limit=100&access_token=${pageAccessToken}`;

    console.log("📡 Fetching REAL Instagram Media...");
    
    const mediaRes = await fetch(mediaUrl);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
        console.error("❌ IG API Error:", mediaData.error);
        throw new Error(mediaData.error.message);
    }

    const dataList = mediaData.data || [];
    console.log(`✅ IG Feed devolvió ${dataList.length} publicaciones reales.`);

    // 4. Formatear
    const posts = dataList.map((p: any) => ({
        id: p.id,             // ID de Instagram (ej: 179...)
        permalink: p.permalink, // URL (ej: https://instagram.com/p/CODE/)
        caption: p.caption || "",
        createdAt: p.timestamp,
        likes: p.like_count || 0,
        comments: p.comments_count || 0,
        shares: 0, 
        views: 0
    }));

    return NextResponse.json({ ok: true, posts });

  } catch (e: any) {
    console.error("IG Metrics Error:", e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}