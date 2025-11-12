import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { AtpAgent } from "@atproto/api";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const { postId, variantId } = await req.json();

  try {
    // 🔍 Get user and their Bluesky access credentials
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email ?? "" },
    });
    if (!user) throw new Error("User not found");

    const access = await prisma.blueSky_Access.findFirst({
      where: { usuarioId: user.id },
    });
    if (!access) throw new Error("No Bluesky account linked");

    const agent = new AtpAgent({ service: "https://bsky.social" });
    await agent.login({
      identifier: access.nombreUsuario,
      password: access.appPassword,
    });

    // 🔍 Get post + variant info
    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new Error("Variant not found");

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new Error("Post not found");

    // 🧠 Prepare Bluesky post
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

    // 🪶 Create the post in Bluesky
   const response = await agent.com.atproto.repo.createRecord({
        repo: agent.session?.did!,
        collection: "app.bsky.feed.post",
        record,
        });

        // Debug de la respuesta de BSKY
        console.log("Bluesky createRecord response:", response);

        const uri = response.data.uri;
        const cid = response.data.cid;

    await prisma.variant.update({
        where: { id: variantId },
        data: { status: "PUBLISHED", uri: uri },
        });

    return Response.json({ ok: true, uri });

  } catch (err: any) {
    console.error("Bluesky publish error:", err);
    return Response.json({ ok: false, error: err.message }, { status: 400 });
  }
}