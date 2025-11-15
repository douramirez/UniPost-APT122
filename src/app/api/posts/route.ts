import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

type VariantInput = {
  network: string;
  text: string;
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
      where: { authorId: user.id }, // 👈 solo posts del usuario
      orderBy: { id: "desc" },
      include: {
        variants: true,
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
      mediaBase64,
    }: {
      organizationId: number;
      title: string;
      body: string;
      variants: VariantInput[];
      mediaBase64?: string | null;
    } = body;

    if (!organizationId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_ORG" },
        { status: 400 }
      );
    }
    if (!title || !variants?.length) {
      return NextResponse.json(
        { ok: false, error: "MISSING_TITLE_OR_VARIANTS" },
        { status: 400 }
      );
    }

    const created = await prisma.post.create({
      data: {
        organizationId,
        authorId: user.id, // 👈 aquí va el ID del usuario logueado
        title,
        body: baseBody || "",
        status: "DRAFT",
        mediaBase64: mediaBase64 || null,
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "MISSING_ID" },
        { status: 400 }
      );
    }

    // (opcional pero recomendado) validar que el post pertenece al usuario
    // const session = await getServerSession();
    // ...

    await prisma.variant.deleteMany({
      where: { postId: Number(id) },
    });

    await prisma.post.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Error DELETE /api/posts:", err);
    return NextResponse.json(
      { ok: false, error: "DELETE_FAILED" },
      { status: 500 }
    );
  }
}