import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export const runtime = "nodejs";

// Crear media container
async function igCreateMedia(imageUrl: string, caption: string, accessToken: string, igBusinessId: string) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${igBusinessId}/media`, {
    method: "POST",
    body: new URLSearchParams({
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    }),
  });

  const json = await res.json();
  if (!json.id) throw new Error(`Instagram media error: ${JSON.stringify(json)}`);

  return json.id;
}

// Publicar media container
async function igPublishContainer(containerId: string, accessToken: string, igBusinessId: string) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${igBusinessId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    }),
  });

  const json = await res.json();
  if (!json.id) throw new Error(`Instagram publish error: ${JSON.stringify(json)}`);

  return json.id;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { postId, variantId } = await req.json();

    // Obtener usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || "" },
    });
    if (!user) throw new Error("User not found");

    // Obtener credenciales IG
    const ig = await prisma.instagram_Access.findFirst({
      where: { userId: user.id },
    });
    if (!ig) throw new Error("Instagram account not linked");

    const { accessToken, usuarioRed, redSocial } = ig;

    // Cargar post + medias
    const variant = await prisma.variant.findUnique({ where: { id: variantId } });
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { medias: { orderBy: { mediaOrder: "asc" } } },
    });

    if (!variant || !post) throw new Error("Post or Variant not found");

    const caption = variant.text || post.body || "";

    const images = post.medias.filter(m => m.mime.startsWith("image"));
    if (images.length === 0) throw new Error("Instagram requires at least one image.");

    // PUBLICACIÓN SINGLE O CARRUSEL
    let publishId = "";

    if (images.length === 1) {
      // -----------------------
      //   Imagen Simple
      // -----------------------
      const mediaId = await igCreateMedia(images[0].url, caption, accessToken!, usuarioRed);
      publishId = await igPublishContainer(mediaId, accessToken!, usuarioRed);
    } else {
      // -----------------------
      //   Carrusel IG
      // -----------------------
      const childIds: string[] = [];

      for (const img of images) {
        const res = await fetch(`https://graph.facebook.com/v21.0/${usuarioRed}/media`, {
          method: "POST",
          body: new URLSearchParams({
            image_url: img.url,
            access_token: accessToken!,
          }),
        });

        const json = await res.json();
        if (!json.id) throw new Error(`IG child error: ${JSON.stringify(json)}`);

        childIds.push(json.id);
      }

      // Crear contenedor de carrusel
      const containerRes = await fetch(`https://graph.facebook.com/v21.0/${usuarioRed}/media`, {
        method: "POST",
        body: new URLSearchParams({
          caption,
          media_type: "CAROUSEL",
          children: childIds.join(","),
          access_token: accessToken!,
        }),
      });

      const containerJson = await containerRes.json();
      if (!containerJson.id) throw new Error(`IG carousel error: ${JSON.stringify(containerJson)}`);

      publishId = await igPublishContainer(containerJson.id, accessToken!, usuarioRed);
    }

    // Actualizar Variant como publicada
    await prisma.variant.update({
      where: { id: variantId },
      data: { status: "PUBLISHED", uri: publishId },
    });

    return NextResponse.json({ ok: true, id: publishId });

  } catch (err: any) {
    console.error("Instagram publish error", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
