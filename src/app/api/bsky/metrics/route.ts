import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { AtpAgent } from "@atproto/api";
import { decryptBlueskySecret } from "@/lib/cryptoBluesky";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return Response.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    // 1. User
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email ?? "" },
    });

    if (!user) {
      return Response.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // 2. Bluesky access
    const access = await prisma.blueSky_Access.findFirst({
      where: { usuarioId: user.id },
    });

    if (!access) {
      return Response.json({
        ok: true,
        posts: [],
        warning: "No Bluesky account linked",
      });
    }

    const decryptedPassword = decryptBlueskySecret(access.appPassword);

    // 3. All BLUESKY variants with URI
    const variants = await prisma.variant.findMany({
      where: {
        network: "BLUESKY",
        uri: { not: null },
        post: {
            authorId: user.id,      // Filtro para mostrar posts del usuario actual
        },
      },
      include: {
        post: true,
      },
    });

    if (!variants.length) {
      return Response.json({ ok: true, posts: [] });
    }

    const uris = variants.map((v) => v.uri!) as string[];

    // 4. Login to Bluesky
    const agent = new AtpAgent({ service: "https://bsky.social" });
      await agent.login({
        identifier: access.nombreUsuario,
        password: decryptedPassword,
      });

    // Buscar post usando URI
    const resp = await agent.app.bsky.feed.getPosts({ uris });

    const variantByUri = new Map(
      variants.map((v) => [v.uri!, v])
    );

    const posts = resp.data.posts.map((p) => {
      const v = variantByUri.get(p.uri);
      const record: any = p.record || {};

      const createdAt =
        record?.createdAt ??
        (v?.date_sent ? v.date_sent.toISOString() : null);

      return {
        uri: p.uri,
        cid: p.cid,
        text: record?.text ?? v?.text ?? "",
        createdAt,
        likes: p.likeCount ?? 0,
        replies: p.replyCount ?? 0,
        reposts: p.repostCount ?? 0,
        quotes: (p as any).quoteCount ?? 0,
        // Bluesky does NOT currently provide views/impressions
        views: null,
        postTitle: v?.post?.title ?? "",
      };
    });

    return Response.json({ ok: true, posts });
  } catch (err: any) {
    console.error("Bluesky metrics error:", err);
    return Response.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}