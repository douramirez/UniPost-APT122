import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { decrypt } from "@/lib/crypto";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    // 1. Obtener Token de BD
    const access = await prisma.tikTok_Access.findFirst({
      where: { userId: user.id, redSocial: 4 },
    });

    if (!access || !access.accessToken) {
      return NextResponse.json({ ok: false, error: "TikTok no conectado" });
    }

    // 🔐 2. Desencriptar
    const token = decrypt(access.accessToken);

    // 3. Consultar API de TikTok
    // Pedimos campos específicos: avatar, nombre, seguidores, likes
    const fields = "avatar_url,display_name,follower_count,likes_count";
    const url = `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`;

    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const json = await res.json();

    // ✅ Verificamos que sea un error REAL (código distinto de 'ok')
    if (json.error && json.error.code !== "ok") { 
      console.error("TikTok API Error:", json.error);
      throw new Error(json.error.message || "Error al obtener perfil de TikTok");
    }

    const data = json.data?.user || {};

    // 4. Retornar datos formateados para tu componente
    return NextResponse.json({
      ok: true,
      profile: {
        username: data.display_name, // TikTok API v2 a veces no da el handle (@), usamos display_name
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        follower_count: data.follower_count || 0,
        likes_count: data.likes_count || 0,
      },
    });

  } catch (error: any) {
    console.error("Profile Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}