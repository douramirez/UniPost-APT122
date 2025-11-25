// src/app/api/instagram/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto"; // ✅ Importado correctamente

const FB_VERSION = process.env.FACEBOOK_API_VERSION ?? "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${FB_VERSION}`;

// --- helpers ----------------------------------------------------------------

async function graph<T>(
  path: string,
  accessToken: string,
  extraParams: Record<string, string> = {}
): Promise<T> {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, GRAPH_BASE);
  url.search = new URLSearchParams({
    access_token: accessToken,
    ...extraParams,
  }).toString();

  const res = await fetch(url.toString());
  const text = await res.text();
  console.log(`📘 [IG profile] ${path} →`, text);

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta no JSON desde Graph en ${path}: ${text}`);
  }

  if (!res.ok) {
    throw new Error(
      `Error de Graph en ${path}: ${json.error?.message ?? text}`
    );
  }

  return json as T;
}

async function getInstagramAccount(accessToken: string) {
  // 1) Intentar páginas del usuario
  const mePages = await graph<{ data?: { id: string; name: string }[] }>(
    "/me/accounts",
    accessToken
  );

  let page = mePages.data?.[0];

  // 2) Si no hay, intentar empresas (Business Manager)
  if (!page) {
    const businesses = await graph<{ data?: { id: string; name: string }[] }>(
      "/me/businesses",
      accessToken
    );
    const business = businesses.data?.[0];
    if (!business) {
      throw new Error(
        "No se encontraron empresas asociadas al usuario en Meta."
      );
    }

    const ownedPages = await graph<{ data?: { id: string; name: string }[] }>(
      `/${business.id}/owned_pages`,
      accessToken
    );
    page = ownedPages.data?.[0];
  }

  if (!page) {
    throw new Error(
      "No se encontraron páginas de Facebook asociadas ni al usuario ni a sus empresas."
    );
  }

  // 3) Obtener instagram_business_account de la página
  const pageData = await graph<{
    instagram_business_account?: { id: string };
  }>(`/${page.id}`, accessToken, {
    fields: "instagram_business_account",
  });

  const igBiz = pageData.instagram_business_account;
  if (!igBiz?.id) {
    throw new Error(
      "La página seleccionada no tiene una cuenta de Instagram profesional vinculada."
    );
  }

  return { igUserId: igBiz.id };
}

// --- handler ----------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    // 1) Buscar el usuario por email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.error("No se encontró User para email:", session.user.email);
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 500 }
      );
    }

    // 2) Usar su id (Int) para buscar el acceso de Instagram
    const igAccess = await prisma.instagram_Access.findFirst({
      where: { userId: user.id, redSocial: 2 },
    });

    if (!igAccess || !igAccess.accessToken) {
      return NextResponse.json(
        { ok: false, linked: false, error: "INSTAGRAM_NOT_LINKED" },
        { status: 200 }
      );
    }

    // 🔐 CAMBIO CRÍTICO: Desencriptar el token antes de usarlo
    const longLivedToken = decrypt(igAccess.accessToken);

    // sacamos el IG user id de nuevo (usando el token desencriptado)
    const { igUserId } = await getInstagramAccount(longLivedToken);

    // ahora pedimos datos del IG User
    const igUser = await graph<{
      id: string;
      username: string;
      profile_picture_url?: string;
      followers_count?: number;
      media_count?: number;
    }>(`/${igUserId}`, longLivedToken, {
      fields:
        "username,profile_picture_url,followers_count,media_count",
    });

    const profile = {
      username: igUser.username,
      profilePictureUrl: igUser.profile_picture_url ?? "",
      followers: igUser.followers_count ?? 0,
      posts: igUser.media_count ?? 0,
    };

    return NextResponse.json({
      ok: true,
      linked: true,
      profile,
    });
  } catch (err: any) {
    console.error("Error en /api/instagram/profile:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}