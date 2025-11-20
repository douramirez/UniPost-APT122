export const runtime = "nodejs";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

type VariantInput = {
  network: string;
  text: string;
};

type MediaInput = {
  base64: string;
  type: "image" | "video";
  order: number;
};

type ScheduleInput = {
  runAt: string;
  timezone: string;
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    const posts = await prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { id: "desc" },
      include: {
        variants: true,
        medias: true, // ⬅️ important
        author: { select: { id: true, name: true, email: true } },
      },
    });


    return NextResponse.json({ ok: true, data: posts });
  } catch (err: any) {
    console.error("❌ Error GET /api/posts:", err);
    return NextResponse.json(
      { ok: false, error: "LIST_FAILED" },
      { status: 500 }
    );
  }
}

function buildAbsoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : ""); // last resort

  if (!base) {
    throw new Error("Base URL not configured for Instagram media.");
  }

  return `${base.replace(/\/$/, "")}${pathOrUrl}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const {
      organizationId,
      title,
      body: baseBody,
      variants,
      medias,
      mediaBase64, // optional legacy support (old composer)
      schedule,
    }: {
      organizationId: number;
      title: string;
      body: string;
      variants: VariantInput[];
      medias?: MediaInput[];
      mediaBase64?: string | null;
      schedule?: ScheduleInput | null;
    } = body;

    if (!organizationId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_ORGANIZATION_ID" },
        { status: 400 }
      );
    }

    if (!title || !variants || variants.length === 0) {
      return NextResponse.json(
        { ok: false, error: "MISSING_TITLE_OR_VARIANTS" },
        { status: 400 }
      );
    }

    const created = await prisma.post.create({
      data: {
        organizationId,
        authorId: user.id,
        title,
        body: baseBody || "",
        status: "DRAFT",
        // ✅ we now store media in the Media table, not in Post.mediaBase64
        mediaBase64: null,
        variants: {
          create: variants.map((v) => ({
            network: v.network,
            text: v.text,
            status: "DRAFT",
          })),
        },
      },
      include: { variants: true },
    });

    // ✳️ If later you want to persist schedule, you can do it here using `created.id`
    // if (schedule && schedule.runAt) { ... }

    // ---- Handle medias (multi-file support) ----

    // Prefer the new `medias[]` from the composer, but still support old `mediaBase64`
    const mediaInputs: MediaInput[] = Array.isArray(medias)
      ? [...medias]
      : mediaBase64
        ? [
          {
            base64: mediaBase64,
            type: "image",
            order: 0,
          },
        ]
        : [];

    // Sort by order ascending to be deterministic
    mediaInputs.sort((a, b) => a.order - b.order);

    for (let index = 0; index < mediaInputs.length; index++) {
      const m = mediaInputs[index];
      if (!m.base64 || !m.base64.startsWith("data:")) continue;

      try {
        const [meta, dataPart] = m.base64.split(",");
        const mimeMatch = meta.match(/data:(.*);base64/);
        const inferredMime = mimeMatch?.[1];

        const isVideo = m.type === "video" || inferredMime?.startsWith("video/");
        const mime =
          inferredMime || (isVideo ? "video/mp4" : "image/jpeg");

        const mediaType = isVideo ? "VIDEO" : "IMAGE"; // Prisma enum MediaType

        // Decide extension from mime
        const extFromMime = mime.split("/")[1] || (isVideo ? "mp4" : "jpg");
        const ext = extFromMime.split(";")[0]; // handle "jpeg;charset=utf-8"

        // Decode base64 to buffer
        const buffer = Buffer.from(dataPart, "base64");

        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadDir, { recursive: true });

        // Create a unique file name
        const filename = `${created.id}-${m.order ?? index}-${randomUUID()}.${ext}`;
        const filePath = path.join(uploadDir, filename);

        // Write file to disk
        await fs.writeFile(filePath, buffer);

        // Path accessible from the browser (and for IG/Bluesky)
        const relativeUrl = `/uploads/${filename}`;

        // Optional: build absolute URL for external APIs
        let absoluteUrl: string | null = null;
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

        if (appUrl) {
          const base =
            appUrl.startsWith("http://") || appUrl.startsWith("https://")
              ? appUrl
              : `https://${appUrl}`;
          absoluteUrl = `${base}${relativeUrl}`;
        }

        await prisma.media.create({
          data: {
            postId: created.id,
            mime,
            type: mediaType,
            size: buffer.length,
            originalBase64: null, // we don't store raw base64 anymore
            url: absoluteUrl ?? relativeUrl,
            mediaLocation: relativeUrl,
            // DB is 1-based, UI is 0-based
            mediaOrder:
              typeof m.order === "number" ? m.order + 1 : index + 1,
          },
        });
      } catch (err) {
        console.error("❌ Error creating Media file:", err);
        // Don't crash the whole request if one media fails
      }
    }

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err: any) {
    console.error("❌ Error POST /api/posts:", err);
    return NextResponse.json(
      { ok: false, error: "CREATE_FAILED" },
      { status: 500 }
    );
  }
}

// 🗑️ Eliminar publicación
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        { ok: false, error: "MISSING_ID" },
        { status: 400 }
      );
    }

    const id = Number(idParam);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ID" },
        { status: 400 }
      );
    }

    // Primero borramos dependencias (Media, Variant), luego el Post
    await prisma.$transaction([
      prisma.media.deleteMany({
        where: { postId: id },
      }),
      prisma.variant.deleteMany({
        where: { postId: id },
      }),
      prisma.post.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Error DELETE /api/posts:", err);
    return NextResponse.json(
      { ok: false, error: "DELETE_FAILED" },
      { status: 500 }
    );
  }
}