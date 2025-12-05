import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { postId, variantId } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || "" },
    });
    if (!user) throw new Error("User not found");

    const fb = await prisma.facebook_Access.findFirst({
      where: { userId: user.id },
    });
    if (!fb) throw new Error("Facebook not linked");

    const { usuarioRed: pageId, accessToken } = fb;

    const variant = await prisma.variant.findUnique({ where: { id: variantId } });
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { medias: { orderBy: { mediaOrder: "asc" } } },
    });

    if (!variant || !post) throw new Error("Post or Variant not found");

    const caption = variant.text || post.body || "";
    const media = post.medias[0];

    if (!media) throw new Error("Facebook requires at least one media.");

    let publishId = "";

    // -----------------------------------
    //  PUBLICACIÓN IMAGE O VIDEO
    // -----------------------------------
    if (media.mime.startsWith("image")) {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos`,
        {
          method: "POST",
          body: new URLSearchParams({
            url: media.url,
            caption,
            access_token: accessToken!,
          }),
        }
      );

      const json = await res.json();
      if (!json.id) throw new Error(`Facebook photo error: ${JSON.stringify(json)}`);
      publishId = json.id;

    } else if (media.mime.startsWith("video")) {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/videos`,
        {
          method: "POST",
          body: new URLSearchParams({
            file_url: media.url,
            description: caption,
            access_token: accessToken!,
          }),
        }
      );

      const json = await res.json();
      if (!json.id) throw new Error(`Facebook video error: ${JSON.stringify(json)}`);
      publishId = json.id;
    }

    // Actualizar Variant
    await prisma.variant.update({
      where: { id: variantId },
      data: { status: "PUBLISHED", uri: publishId },
    });

    return NextResponse.json({ ok: true, id: publishId });

  } catch (err: any) {
    console.error("Facebook publish error", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
