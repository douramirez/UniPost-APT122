import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

const GRAPH_BASE_URL = "https://graph.facebook.com/v21.0";

type GraphError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

async function getInstagramCredentialsForUser(userId: number) {
  const igAccess = await prisma.instagram_Access.findFirst({
    where: {
      userId,
      redSocial: 2,
    },
  });

  if (!igAccess || !igAccess.accessToken) {
    throw new Error(
      "Instagram no está vinculado o falta accessToken en Instagram_Access."
    );
  }

  const userAccessToken = decrypt(igAccess.accessToken);

  const url = new URL(`${GRAPH_BASE_URL}/me/accounts`);
  url.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username}"
  );
  url.searchParams.set("access_token", userAccessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    console.error("❌ Error /me/accounts IG:", text);
    const err = json as GraphError;
    throw new Error(err.error?.message ?? "No se pudo obtener las páginas.");
  }

  const pages: any[] = json?.data ?? [];
  const pageWithIg = pages.find(
    (p) => p.instagram_business_account && p.instagram_business_account.id
  );

  if (!pageWithIg) {
    throw new Error(
      "No se encontró ninguna página con cuenta de Instagram vinculada."
    );
  }

  const pageAccessToken = pageWithIg.access_token as string;
  const igUserId = pageWithIg.instagram_business_account.id as string;

  return { pageAccessToken, igUserId };
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { ok: false, error: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { pageAccessToken } =
      await getInstagramCredentialsForUser(user.id);

    // Variantes de Instagram ya publicadas con uri (media ID)
    const variants = await prisma.variant.findMany({
      where: {
        network: "INSTAGRAM",
        status: "PUBLISHED",
        uri: { not: null },
      },
      include: {
        post: true,
      },
      orderBy: {
        date_sent: "desc",
      },
      take: 20,
    });

    console.log(
      "📌 IG Metrics: variants found:",
      variants.map((v) => ({
        id: v.id,
        uri: v.uri,
        network: v.network,
        status: v.status,
        title: v.post?.title,
      }))
    );

    const posts: any[] = [];

    for (const v of variants) {
      const mediaId = v.uri!;
      try {
        console.log("🔍 IG Metrics: processing variant", {
          variantId: v.id,
          mediaId,
          postTitle: v.post?.title,
        });

        // ⚠️ SIN video_view_count
        const infoUrl = new URL(`${GRAPH_BASE_URL}/${mediaId}`);
        infoUrl.searchParams.set(
          "fields",
          "caption,like_count,comments_count,media_type,media_product_type,timestamp"
        );
        infoUrl.searchParams.set("access_token", pageAccessToken);

        console.log("📡 Fetching IG media info:", infoUrl.toString());

        const infoRes = await fetch(infoUrl.toString(), { method: "GET" });
        const infoText = await infoRes.text();

        if (!infoRes.ok) {
          console.error("❌ IG media info error:", {
            variantId: v.id,
            mediaId,
            status: infoRes.status,
            error: infoText,
          });
          continue;
        }

        let infoJson: any;
        try {
          infoJson = infoText ? JSON.parse(infoText) : {};
        } catch {
          console.error("❌ IG media JSON parse error:", infoText);
          continue;
        }

        const likeCount = (infoJson.like_count as number) ?? 0;
        const commentsCount = (infoJson.comments_count as number) ?? 0;
        const caption = (infoJson.caption as string) ?? null;
        const createdAt = (infoJson.timestamp as string) ?? null;

        // Por ahora sin insights (no tenemos instagram_manage_insights)
        const shares = 0;
        const views: number | null = null;

        console.log("✅ Added IG metric row:", {
          mediaId,
          likeCount,
          commentsCount,
          shares,
          views,
          createdAt,
        });

        posts.push({
          id: mediaId,
          caption,
          likeCount,
          commentsCount,
          shares,
          views,
          createdAt,
          postTitle: v.post?.title ?? null,
        });
      } catch (err) {
        console.error("❌ Error procesando media IG:", err);
      }
    }

    return NextResponse.json({ ok: true, posts });
  } catch (err: any) {
    console.error("❌ /api/instagram/metrics error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}