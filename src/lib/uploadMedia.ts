import { createSupabaseClient } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export async function uploadMediaAndSave(
  file: Buffer,
  mime: string,
  postId: number
) {
  const supabase = createSupabaseClient(); // ← Cliente en runtime

  const ext = mime.split("/")[1];
  const filename = `${postId}-${Date.now()}.${ext}`;

  // Subir a Supabase
  const { data, error } = await supabase.storage
    .from("media")
    .upload(filename, file, {
      contentType: mime,
    });

  if (error) throw error;

  const publicUrl = supabase.storage.from("media").getPublicUrl(filename).data.publicUrl;

  // Guardar en Prisma
  const media = await prisma.media.create({
    data: {
      postId,
      url: publicUrl,
      mime,
      type: "IMAGE",
      size: file.length,
      mediaLocation: "SUPABASE",
    },
  });

  return media;
}
