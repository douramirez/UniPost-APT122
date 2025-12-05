import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseClient(); // ← CLIENTE SOLO EN RUNTIME

    const formData = await req.formData();

    const file = formData.get("file") as File;
    const postId = Number(formData.get("postId"));

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!postId) return NextResponse.json({ error: "No postId" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.type.split("/")[1];
    const filename = `${postId}-${Date.now()}.${ext}`;

    // ⬆ Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from("media")
      .upload(filename, buffer, {
        contentType: file.type,
      });

    if (error) throw error;

    const publicUrl = supabase.storage
      .from("media")
      .getPublicUrl(filename).data.publicUrl;

    // ⬆ Guardar en Prisma
    const media = await prisma.media.create({
      data: {
        postId,
        url: publicUrl,
        mime: file.type,
        type: "IMAGE",
        mediaLocation: "SUPABASE",
      },
    });

    return NextResponse.json({ ok: true, media });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
