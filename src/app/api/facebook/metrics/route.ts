import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

const GRAPH_BASE_URL = "https://graph.facebook.com/v21.0";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    // 1. Credenciales
    const fbAccess = await prisma.facebook_Access.findFirst({ where: { userId: user.id, redSocial: 3 } });
    if (!fbAccess) throw new Error("Facebook no conectado");

    const userToken = decrypt(fbAccess.accessToken!);

    // 2. Obtener Página
    const accountsRes = await fetch(`${GRAPH_BASE_URL}/me/accounts?access_token=${userToken}`);
    const accounts = await accountsRes.json();
    const page = accounts.data?.[0]; // Usamos la primera página

    if (!page) throw new Error("No se encontró página de Facebook");

    // 3. Obtener Feed de la Página
    // likes.summary(true) nos da el total real
    const fields = "id,created_time,shares,likes.summary(true).limit(0),comments.summary(true).limit(0)";
    const feedUrl = `${GRAPH_BASE_URL}/${page.id}/feed?fields=${fields}&limit=100&access_token=${page.access_token}`;

    const res = await fetch(feedUrl);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    const posts = (data.data || []).map((p: any) => ({
        id: p.id, // Formato esperado: "PageID_PostID" (ej: 923..._122...)
        likes: p.likes?.summary?.total_count || 0,
        comments: p.comments?.summary?.total_count || 0,
        shares: p.shares?.count || 0,
        views: 0,
        createdAt: p.created_time
    }));

    return NextResponse.json({ ok: true, posts });

  } catch (e: any) {
    console.error("FB Metrics Error:", e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}