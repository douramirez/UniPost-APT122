// src/app/api/instagram/callback/route.ts

// El callback lo utiliza Meta para enviarnos los datos correspondientes (principalmente el Token)
// que utilizaremos para todo lo que buscamos (Ver perfil, enviar publicaciones, pedir metricas, etc)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FB_VERSION = process.env.FACEBOOK_API_VERSION ?? "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${FB_VERSION}`;
const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;

// 1) Intercambia el "code" por un token de usuario de corta duración
async function exchangeCodeForShortLivedToken(code: string) {
  if (!APP_ID || !APP_SECRET || !REDIRECT_URI) {
    throw new Error(
      `Faltan variables de entorno para Instagram: ` +
        `APP_ID=${!!APP_ID}, APP_SECRET=${!!APP_SECRET}, REDIRECT_URI=${!!REDIRECT_URI}`
    );
  }

  // Debug para verifica que cosas del .env están presentes (solo largos)
  console.log(
    "Instagram OAuth envs:",
    "APP_ID length =", APP_ID.length,
    "APP_SECRET length =", APP_SECRET.length,
    "REDIRECT_URI =", REDIRECT_URI
  );

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", APP_ID);
  url.searchParams.set("client_secret", APP_SECRET);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error exchangeCodeForShortLivedToken: ${text}`);
  }

  // { access_token, token_type, expires_in }
  return (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
}

// 2) Intercambia el token corto por uno de larga duración
async function exchangeForLongLivedToken(shortLivedToken: string) {
  if (!APP_ID || !APP_SECRET) {
    throw new Error(
      `Faltan variables de entorno para el intercambio de token largo: ` +
        `APP_ID=${!!APP_ID}, APP_SECRET=${!!APP_SECRET}`
    );
  }

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", APP_ID);
  url.searchParams.set("client_secret", APP_SECRET);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error exchangeForLongLivedToken: ${text}`);
  }

  // { access_token, token_type, expires_in }
  return (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
}

// 3) Obtiene la cuenta de Instagram Business a partir del token de larga duración que nos mandó
async function getInstagramAccount(longLivedToken: string) {
  // 3.1) Listar las páginas asociadas al usuario
  const pagesRes = await fetch(
    `${GRAPH_BASE}/me/accounts?access_token=${encodeURIComponent(longLivedToken)}`
  );

  const rawText = await pagesRes.text();
  console.log("📘 /me/accounts raw response:", rawText);

  if (!pagesRes.ok) {
    throw new Error(`Error al obtener páginas de Facebook: ${rawText}`);
  }

  const pagesData = JSON.parse(rawText) as {
    data?: Array<{ id: string; name: string }>;
  };

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error(
      "No se encontraron páginas de Facebook asociadas a este usuario."
    );
  }

  const page = pagesData.data[0];
  console.log("✅ Página seleccionada:", page);

  // 3.2) Obtener el instagram_business_account de esa página
  const pageDetailsRes = await fetch(
    `${GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(
      longLivedToken
    )}`
  );

  if (!pageDetailsRes.ok) {
    const text = await pageDetailsRes.text();
    throw new Error(`Error al obtener instagram_business_account: ${text}`);
  }

  const pageDetails = (await pageDetailsRes.json()) as {
    instagram_business_account?: { id: string };
  };

  if (!pageDetails.instagram_business_account?.id) {
    throw new Error(
      "La página seleccionada no tiene vinculada una cuenta de Instagram Business."
    );
  }

  const igUserId = pageDetails.instagram_business_account.id;

  // 3.3) Obtener datos básicos de la cuenta de Instagram (username)
  const igRes = await fetch(
    `${GRAPH_BASE}/${igUserId}?fields=username&access_token=${encodeURIComponent(
      longLivedToken
    )}`
  );

  if (!igRes.ok) {
    const text = await igRes.text();
    throw new Error(`Error al obtener datos de la cuenta de Instagram: ${text}`);
  }

  const igData = (await igRes.json()) as { username: string };

  return {
    igUserId,
    username: igData.username,
  };
}

// Export nombrado GET
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("Error de OAuth de Meta:", error);
    const redirectError = new URL("/perfil?instagram_error=oauth_error", url.origin);
    return NextResponse.redirect(redirectError);
  }

  if (!code || !state) {
    const redirectError = new URL(
      "/perfil?instagram_error=missing_params",
      url.origin
    );
    return NextResponse.redirect(redirectError);
  }

  const userId = Number(state);
  if (Number.isNaN(userId)) {
    const redirectError = new URL(
      "/perfil?instagram_error=invalid_state",
      url.origin
    );
    return NextResponse.redirect(redirectError);
  }

  try {
    // 1) code -> short-lived token
    const shortTokenData = await exchangeCodeForShortLivedToken(code);

    // 2) short-lived -> long-lived token
    const longTokenData = await exchangeForLongLivedToken(
      shortTokenData.access_token
    );

    const longLivedToken = longTokenData.access_token;

    // 3) Obtener cuenta de Instagram Business + username
    const { igUserId, username } = await getInstagramAccount(longLivedToken);

    // 4) Guardar / actualizar en tu tabla Instagram_Access
    await prisma.instagram_Access
      .upsert({
        where: {
          // ver nota en comentarios anteriores; esto es un truco,
          // idealmente deberíamos tener @@unique([userId, redSocial])
          id: BigInt(0),
        },
        update: {},
        create: {
          userId,
          redSocial: 2, // 2, pues en nuestra tabla de redes Instagram es 2
          usuarioRed: username,
          accessToken: longLivedToken,
        },
      })
      .catch(async (err) => {
        console.warn("Fallo el upsert directo, usando fallback:", err);

        const existing = await prisma.instagram_Access.findFirst({
          where: { userId },
        });

        if (existing) {
          await prisma.instagram_Access.update({
            where: { id: existing.id },
            data: {
              usuarioRed: username,
              accessToken: longLivedToken,
            },
          });
        } else {
          await prisma.instagram_Access.create({
            data: {
              userId,
              redSocial: 2,
              usuarioRed: username,
              accessToken: longLivedToken,
            },
          });
        }
      });

    const redirectOk = new URL("/perfil?instagram=linked", url.origin);
    return NextResponse.redirect(redirectOk);
  } catch (err: any) {
  console.error("Error en callback de Instagram:", err);
  const urlErrMsg =
    err instanceof Error ? err.message : "unknown_error";
  const redirectError = new URL(
    `/perfil?instagram_error=${encodeURIComponent(urlErrMsg)}`,
    url.origin
  );
  return NextResponse.redirect(redirectError);
}
}