import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { AtpAgent } from "@atproto/api";
import { decryptBlueskySecret } from "@/lib/cryptoBluesky";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });

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

    // Busca información de post y sus variantes
    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new Error("Variant not found");

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new Error("Post not found");

    // Prepara post para Bluesky 
    const record: any = {
      $type: "app.bsky.feed.post",
      text: variant.text || post.body,
      createdAt: new Date().toISOString(),
    };

    if (post.mediaBase64 && post.mediaBase64.startsWith("data:image")) {
      const imageBuffer = Buffer.from(
        post.mediaBase64.split(",")[1],
        "base64"
      );

      const blob = await agent.uploadBlob(imageBuffer, { encoding: "image/png" });
      record.embed = {
        $type: "app.bsky.embed.images",
        images: [
          {
            image: blob.data.blob,
            alt: post.title || "Post image",
          },
        ],
      };
    }

    // Creación de post en BlueSky
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
      now.getDate()
    );

    // Adquiere Tiempo (Hora)
    const timeOnly = new Date(
      1970, 0, 1,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
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
    return Response.json({ ok: false, error: err.message }, { status: 400 });
  }
}