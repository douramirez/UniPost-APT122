import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  const id = Number(params.mediaId);

  if (!Number.isFinite(id)) {
    return new NextResponse("Invalid media id", { status: 400 });
  }

  const media = await prisma.media.findUnique({
    where: { id },
    select: { url: true },
  });

  if (!media || !media.url) {
    return new NextResponse("Media not found", { status: 404 });
  }

  // 🔥 Redirige al archivo en Supabase Storage
  return NextResponse.redirect(media.url, 302);
}
