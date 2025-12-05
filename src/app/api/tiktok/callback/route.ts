import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { encrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://www.unipost.click/";

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("TikTok Auth Error:", error);
    return NextResponse.redirect(new URL("/perfil?error=tiktok_denied", baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/perfil?error=no_code", baseUrl));
  }

  try {
    // -------------------------
    // 1️⃣ OBTENER CODE VERIFIER
    // -------------------------
    const codeVerifier = req.cookies.get("tiktok_code_verifier")?.value;

    if (!codeVerifier) {
      console.error("Falta code_verifier en cookies");
      return NextResponse.redirect(
        new URL("/perfil?error=missing_code_verifier", baseUrl)
      );
    }

    // -------------------------
    // 2️⃣ SOLICITAR TOKEN
    // -------------------------
    const tokenEndpoint = "https://open.tiktokapis.com/v2/oauth/token/";
    const params = new URLSearchParams();

    params.append("client_key", process.env.TIKTOK_CLIENT_KEY!);
    params.append("client_secret", process.env.TIKTOK_CLIENT_SECRET!);
    params.append("code", code);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", process.env.TIKTOK_REDIRECT_URI!);

    // 🔥🔥🔥 Lo que te faltaba 🔥🔥🔥
    params.append("code_verifier", codeVerifier);

    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: params,
    });

    const tokenData = await tokenRes.json();
    console.log("TikTok token response:", tokenData);

    if (tokenData.error) {
      throw new Error(
        `TikTok Token Error: ${
          tokenData.error_description || JSON.stringify(tokenData)
        }`
      );
    }

    // -------------------------
    // 3️⃣ LIMPIAR COOKIE PKCE
    // -------------------------
    const response = NextResponse.redirect(
      new URL("/perfil?tiktok=linked", baseUrl)
    );

    response.cookies.set("tiktok_code_verifier", "", {
      path: "/",
      maxAge: 0,
    });

    // -------------------------
    // 4️⃣ GUARDAR TOKENS EN BD
    // -------------------------
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) throw new Error("Usuario local no encontrado");

    const TIKTOK_SOCIAL_ID = 4;

    const existing = await prisma.tikTok_Access.findFirst({
      where: { userId: user.id, redSocial: TIKTOK_SOCIAL_ID },
    });

    const dataToSave = {
      userId: user.id,
      redSocial: TIKTOK_SOCIAL_ID,
      openId: tokenData.open_id,
      accessToken: encrypt(tokenData.access_token),
      refreshToken: encrypt(tokenData.refresh_token),
      expiresIn: tokenData.expires_in,
    };

    if (existing) {
      await prisma.tikTok_Access.update({
        where: { id: existing.id },
        data: dataToSave,
      });
    } else {
      await prisma.tikTok_Access.create({ data: dataToSave });
    }

    return response;
  } catch (error) {
    console.error("❌ Error en callback de TikTok:", error);
    return NextResponse.redirect(
      new URL("/perfil?error=tiktok_failed", baseUrl)
    );
  }
}
