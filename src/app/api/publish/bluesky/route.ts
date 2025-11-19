import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { AtpAgent } from "@atproto/api";
import { decryptBlueskySecret } from "@/lib/cryptoBluesky";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function buildHashtagFacets(text: string) {
  const facets: any[] = [];
  // Unicode letters + numbers + underscore
  const regex = /#[\p{L}\p{N}_]+/gu;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const hashtag = match[0]; // e.g. "#Genshin"
    const startChar = match.index;
    const endChar = startChar + hashtag.length;

    const encoder = new TextEncoder();
    const fullTextBytes = encoder.encode(text);
    const beforeBytes = encoder.encode(text.slice(0, startChar));
    const hashtagBytes = encoder.encode(text.slice(startChar, endChar));

    const byteStart = beforeBytes.length;
    const byteEnd = byteStart + hashtagBytes.length;

    facets.push({
      index: {
        byteStart,
        byteEnd,
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#tag",
          tag: hashtag.slice(1), // remove the leading '#'
        },
      ],
    });
  }

  return facets;
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session)
    return Response.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );

  const { postId, variantId } = await req.json();

  try {
    // Busca usuario y sus credenciales de Bluesky
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email ?? "" },
    });
    if (!user) throw new Error("User not found");

    const access = await prisma.blueSky_Access.findFirst({
      where: { usuarioId: user.id },
    });
    if (!access) throw new Error("No Bluesky access found");

    const decryptedPassword = decryptBlueskySecret(access.appPassword);

    const agent = new AtpAgent({ service: "https://bsky.social" });
    await agent.login({
      identifier: access.nombreUsuario,
      password: decryptedPassword,
    });

    // Busca información de post y su variante
    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new Error("Variant not found");

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        medias: {
          orderBy: { mediaOrder: "asc" }, // mismo orden que el carrusel del composer
        },
      },
    });
    if (!post) throw new Error("Post not found");

    const medias = post.medias ?? [];

    const imageMedias = medias.filter(
      (m) =>
        m.type === "IMAGE" ||
        (m.mime || "").toLowerCase().startsWith("image/"),
    );
    const videoMedias = medias.filter(
      (m) =>
        m.type === "VIDEO" ||
        (m.mime || "").toLowerCase().startsWith("video/"),
    );

    // 🔒 Reglas Bluesky: máx 4 imágenes o 1 video (sin mezclar)
    if (videoMedias.length > 1) {
      return Response.json(
        { ok: false, error: "Bluesky solo permite 1 video por post." },
        { status: 400 },
      );
    }

    if (videoMedias.length === 1 && imageMedias.length > 0) {
      return Response.json(
        {
          ok: false,
          error:
            "Bluesky no permite mezclar imágenes y video en el mismo post.",
        },
        { status: 400 },
      );
    }

    let mode: "text" | "images" | "video" = "text";

    if (videoMedias.length === 1) {
      mode = "video";
    } else if (imageMedias.length > 0) {
      mode = "images";
    }

    const selectedImages =
      mode === "images" ? imageMedias.slice(0, 4) : [];
    const selectedVideo =
      mode === "video" ? videoMedias[0] : null;

    // Prepara texto y facets
    const text = (variant.text || post.body || "").toString();
    const facets = buildHashtagFacets(text);

    const record: any = {
      $type: "app.bsky.feed.post",
      text,
      createdAt: new Date().toISOString(),
      ...(facets.length ? { facets } : {}),
    };

    // Construir embed según modo
    if (mode === "images" && selectedImages.length > 0) {
      const images: any[] = [];

      for (const media of selectedImages) {
        // Construimos la URL pública. Si es relativa, la pegamos a APP_URL.
        const mediaUrl = media.url.startsWith("http")
          ? media.url
          : `${APP_URL}${media.url}`;

        const resImg = await fetch(mediaUrl);
        if (!resImg.ok) {
          throw new Error("No se pudo descargar la imagen para Bluesky");
        }

        const arrayBuffer = await resImg.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        const blob = await agent.uploadBlob(imageBuffer, {
          encoding: media.mime || "image/jpeg",
        });

        images.push({
          image: blob.data.blob,
          alt: post.title || "Post image",
        });
      }

      record.embed = {
        $type: "app.bsky.embed.images",
        images,
      };
    } else if (mode === "video" && selectedVideo) {
      // Implementación simple: video como enlace externo
      // (Más adelante se puede migrar a app.bsky.embed.video si quieres soporte nativo)
      const videoUrl = selectedVideo.url.startsWith("http")
        ? selectedVideo.url
        : `${APP_URL}${selectedVideo.url}`;

      record.embed = {
        $type: "app.bsky.embed.external",
        external: {
          uri: videoUrl,
          title: post.title || "Video",
          description: "",
        },
      };
    }
    // Si mode === "text", no se agrega embed

    // Creación de post en Bluesky
    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did!,
      collection: "app.bsky.feed.post",
      record,
    });

    // Debug de la respuesta de BSKY
    console.log("Bluesky createRecord response:", response);

    const uri = response.data.uri;
    const cid = response.data.cid;

    const now = new Date();

    // Adquiere Fecha
    const dateOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Adquiere Tiempo (Hora)
    const timeOnly = new Date(
      1970,
      0,
      1,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    );

    // Actualiza en prisma estado de variante
    await prisma.variant.update({
      where: { id: variantId },
      data: {
        status: "PUBLISHED",
        uri: uri,
        date_sent: dateOnly,
        time_sent: timeOnly,
      },
    });

    return Response.json({ ok: true, uri });
  } catch (err: any) {
    console.error("Bluesky publish error:", err);
    return Response.json(
      { ok: false, error: err.message },
      { status: 400 },
    );
  }
}