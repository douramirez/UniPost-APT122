import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function base64url(buffer: ArrayBuffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generatePKCE() {
const randomValues = crypto.getRandomValues(new Uint8Array(32));
const code_verifier = base64url(randomValues.buffer);

  const encoder = new TextEncoder();
  const data = encoder.encode(code_verifier);

  const digest = await crypto.subtle.digest("SHA-256", data);
  const code_challenge = base64url(digest);

  return { code_verifier, code_challenge };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    const baseUrl = process.env.NEXTAUTH_URL || "https://unipost.click/api/tiktok/callback";
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const csrfState = Math.random().toString(36).substring(2);

  const { code_verifier, code_challenge } = await generatePKCE();

  // Crear respuesta 302 sin URL inicial
  const response = new NextResponse(null, { status: 302 });

  // Guardar cookie
  response.cookies.set("tiktok_code_verifier", code_verifier, {
    httpOnly: true,
    secure: false,
    path: "/",
  });

  // Construir la URL TikTok completa
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "user.info.basic,user.info.stats,video.upload,video.publish"
  );
  url.searchParams.set("redirect_uri", process.env.TIKTOK_REDIRECT_URI!);
  url.searchParams.set("state", csrfState);
  url.searchParams.set("code_challenge", code_challenge);
  url.searchParams.set("code_challenge_method", "S256");

  // Redirigir hacia TikTok
  response.headers.set("Location", url.toString());

  return response;
}
