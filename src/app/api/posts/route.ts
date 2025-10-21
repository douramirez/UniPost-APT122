// src/app/api/posts/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type VariantInput = {
  network: 'INSTAGRAM' | 'FACEBOOK' | 'X' | 'LINKEDIN';
  text: string;
};

// ✅ Listar publicaciones
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') ?? undefined;

    const posts = await prisma.post.findMany({
      where: orgId ? { organizationId: Number(orgId) } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
        schedule: true,
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, data: posts });
  } catch (err: any) {
    console.error('❌ Error GET /api/posts:', err);
    return NextResponse.json({ ok: false, error: 'LIST_FAILED' }, { status: 500 });
  }
}

// ✅ Crear nueva publicación
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      organizationId,
      authorId,
      title,
      body: baseBody,
      variants,
      schedule,
    }: {
      organizationId: string;
      authorId: string;
      title?: string;
      body?: string;
      variants: VariantInput[];
      schedule?: { runAt: string; timezone: string } | null;
    } = body;

    if (!organizationId || !authorId) {
      return NextResponse.json({ ok: false, error: 'MISSING_ORG_OR_AUTHOR' }, { status: 400 });
    }
    if (!Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json({ ok: false, error: 'MISSING_VARIANTS' }, { status: 400 });
    }

    const created = await prisma.post.create({
      data: {
        organizationId:Number(organizationId),
        authorId:Number(authorId),
        title,
        body: baseBody,
        status: schedule ? 'SCHEDULED' : 'DRAFT',
        variants: {
          create: variants.map((v) => ({
            network: v.network,
            text: v.text,
            status: schedule ? 'QUEUED' : 'DRAFT',
            media: [],
          })),
        },
        ...(schedule
          ? {
              schedule: {
                create: {
                  runAt: new Date(schedule.runAt),
                  timezone: schedule.timezone || 'UTC',
                },
              },
            }
          : {}),
      },
      include: { variants: true, schedule: true },
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err: any) {
    console.error('❌ Error POST /api/posts:', err, err?.stack);
    return NextResponse.json({ ok: false, error: 'CREATE_FAILED', detail: String(err) }, { status: 500 });
  }
}
