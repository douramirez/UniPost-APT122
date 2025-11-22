import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishToBlueskyInternal } from "@/app/api/publish/bluesky/route";
import { publishToInstagramInternal } from "@/app/api/publish/instagram/route";

// Evita que Vercel cachee la respuesta, asegurando que el cron ejecute lógica real cada vez
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Validación de seguridad recomendada (Bearer Token configurado en variables de entorno)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Buscar posts agendados que ya vencieron (runAt <= ahora)
    const dueSchedules = await prisma.schedule.findMany({
      where: {
        runAt: {
          lte: now,
        },
      },
      include: {
        post: {
          include: {
            variants: true,
          },
        },
      },
    });

    if (dueSchedules.length === 0) {
      return NextResponse.json({ ok: true, message: "No hay publicaciones pendientes." });
    }

    let processedCount = 0;
    let errorsCount = 0;

    // 2. Procesar cada elemento agendado
    for (const schedule of dueSchedules) {
      const post = schedule.post;
      const authorId = post.authorId; // ID del usuario que creó el post

      console.log(`⏰ Procesando agenda ID ${schedule.id} para post ${post.id}`);

      // Intentar publicar cada variante del post
      for (const variant of post.variants) {
        // Si ya está publicada, la saltamos
        if (variant.status === "PUBLISHED") continue;

        try {
          if (variant.network === "BLUESKY") {
            await publishToBlueskyInternal(authorId, post.id, variant.id);
            console.log(`✅ Bluesky publicado auto: Post ${post.id}`);
          } 
          else if (variant.network === "INSTAGRAM") {
            await publishToInstagramInternal(authorId, post.id, variant.id);
            console.log(`✅ Instagram publicado auto: Post ${post.id}`);
          }
        } catch (e) {
          console.error(`❌ Error publicando variante ${variant.id} en Cron:`, e);
          errorsCount++;
          // Opcional: Podrías agregar un estado "FAILED" a la variante aquí si quisieras
        }
      }

      // 3. Limpieza post-procesamiento
      // Actualizamos el estado del post padre a PUBLISHED (asumiendo éxito parcial o total)
      await prisma.post.update({
        where: { id: post.id },
        data: { status: "PUBLISHED" }
      });

      // Eliminamos la entrada de la agenda para que no se vuelva a ejecutar
      await prisma.schedule.delete({
        where: { id: schedule.id },
      });

      processedCount++;
    }

    return NextResponse.json({ 
      ok: true, 
      processed: processedCount, 
      errors: errorsCount,
      message: `Procesados ${processedCount} posts con ${errorsCount} errores.`
    });

  } catch (error: any) {
    console.error("🔥 Cron Fatal Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}