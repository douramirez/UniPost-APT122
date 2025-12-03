import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: any
) {
  const { mediaId } = await params.mediaId;
  try {
    const id = Number(params.mediaId);
    if (!Number.isFinite(id)) {
      return new NextResponse("Invalid media id", { status: 400 });
    }

    const media = await prisma.media.findUnique({
      where: { id },
      select: { mime: true, originalBase64: true },
    });

    if (!media || !media.originalBase64) {
      return new NextResponse("Media not found", { status: 404 });
    }

    const buffer = Buffer.from(media.originalBase64, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": media.mime ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error in /api/media/[id]:", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}