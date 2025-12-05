import { supabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export async function uploadMediaAndSave(file: Buffer, mime: string, postId: number) {
  const extension = mime.split("/")[1];
  const fileName = `${postId}-${Date.now()}.${extension}`;

  const { data, error } = await supabase.storage
    .from("media")
    .upload(fileName, file, {
      upsert: false,
      contentType: mime
    });

  if (error) throw error;

  const url = supabase.storage.from("media").getPublicUrl(fileName).data.publicUrl;

  const media = await prisma.media.create({
    data: { 
      postId,
      url,
      mime,
      type: "IMAGE",
      mediaLocation: "SUPABASE",
    } ,
  });

  return media;
}
