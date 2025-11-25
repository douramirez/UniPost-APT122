import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Evita que Vercel/Next cachee la respuesta estáticamente
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const variants = await prisma.variant.findMany({
      where: {
        status: "PUBLISHED", // Solo publicados
        uri: { not: null },  // Que tengan enlace real
        
        // 👇 FILTRO DE SEGURIDAD: Solo mostrar si el post padre es visible
        post: {
          visible: true, 
        },
      },
      orderBy: { id: "desc" }, // Los más recientes primero
      take: 50,
      include: {
        post: {
          select: {
            title: true,
            body: true,
            category: true, // 👈 ¡ESTA ES LA CLAVE PARA EL FILTRO!
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: variants });
  } catch (err) {
    console.error("❌ Error GET /api/public-feed:", err);
    return NextResponse.json(
      { ok: false, error: "FEED_FAILED" },
      { status: 500 }
    );
  }
}