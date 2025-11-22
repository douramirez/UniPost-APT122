import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma"; // Asegúrate de importar tu instancia de prisma correctamente
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Helper para serializar BigInt a String/Number (JSON no soporta BigInt nativo)
function serializeBigInt(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, roleID: true, organizationId: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const roleId = Number(user.roleID || 0);
  const { searchParams } = new URL(request.url);
  const queryOrgId = searchParams.get("orgId");
  const isSuperAdmin = roleId >= 4;
  
  let targetOrgId = user.organizationId;
  if (isSuperAdmin && queryOrgId) {
    targetOrgId = parseInt(queryOrgId);
  }

  try {
    let responseData: any = {
      isSuperAdmin,
      userOrgId: user.organizationId,
      members: [],
      orphanedUsers: [], // 👈 Inicializamos array vacío
    };

    if (isSuperAdmin) {
      const allOrgs = await prisma.organization.findMany({
        orderBy: { id: 'asc' },
      });
      responseData.organizations = allOrgs;

      // 👇 NUEVO: Buscar usuarios sin organización (huérfanos)
      const orphans = await prisma.user.findMany({
        where: { 
          organizationId: null,
          // Opcional: filtrar para no mostrar otros super admins sin org
          // roleID: { lt: 4 } 
        },
        select: { id: true, name: true, email: true, roleID: true },
        orderBy: { id: 'desc' }
      });
      responseData.orphanedUsers = orphans;
    }

    if (targetOrgId) {
      // 1. Métricas Globales (Totales)
      // Nota: Aquí ya estábamos contando Variantes, así que esto se queda igual.
      const metricsAggregate = await prisma.metric.aggregate({
        _sum: { likes: true, comments: true },
        where: { post: { organizationId: targetOrgId } },
      });

      const publishedCount = await prisma.variant.count({
        where: {
          status: "PUBLISHED",
          post: { organizationId: targetOrgId },
        },
      });

      responseData.metrics = {
        likes: metricsAggregate._sum.likes || 0,
        comments: metricsAggregate._sum.comments || 0,
        publishedPosts: publishedCount, // Total global de variants
        organizationId: targetOrgId,
      };

      // 2. 👥 CALCULAR ESTADÍSTICAS POR MIEMBRO (CORREGIDO)
      const orgPosts = await prisma.post.findMany({
        where: { organizationId: targetOrgId },
        select: {
          authorId: true,
          // 👇 AHORA TRAEMOS LAS VARIANTES PUBLICADAS
          variants: {
            where: { status: "PUBLISHED" },
            select: { id: true } // Solo necesitamos contar, el ID es suficiente
          },
          metrics: {
            select: { likes: true },
          },
        },
      });

      const statsByAuthor: Record<number, { posts: number; likes: number }> = {};

      for (const post of orgPosts) {
        if (!statsByAuthor[post.authorId]) {
          statsByAuthor[post.authorId] = { posts: 0, likes: 0 };
        }
        
        // 🛠️ CORRECCIÓN AQUÍ:
        // Antes sumábamos 1 (el post padre).
        // Ahora sumamos la cantidad de variantes publicadas que tiene ese post.
        statsByAuthor[post.authorId].posts += post.variants.length;
        
        // Sumar likes (se mantiene igual)
        const totalPostLikes = post.metrics.reduce((acc, m) => acc + m.likes, 0);
        statsByAuthor[post.authorId].likes += totalPostLikes;
      }

      // Obtener datos de usuario
      const dbMembers = await prisma.user.findMany({
        where: { organizationId: targetOrgId },
        select: { id: true, name: true, email: true, roleID: true },
      });

      // Mapear respuesta
      responseData.members = dbMembers.map((member) => ({
        id: member.id,
        name: member.name || "Sin nombre",
        email: member.email,
        roleId: member.roleID,
        totalPosts: statsByAuthor[member.id]?.posts || 0,
        totalLikes: statsByAuthor[member.id]?.likes || 0,
      }));
    }

    return NextResponse.json({ ok: true, data: serializeBigInt(responseData) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// Crear Organización (Solo Roles >= 4)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const roleId = Number(user?.roleID || 0);

  if (roleId < 4) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, plan } = body;

  try {
    const newOrg = await prisma.organization.create({
      data: {
        name,
        plan: plan || "FREE",
      },
    });
    return NextResponse.json({ ok: true, data: newOrg });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Error creating org" });
  }
}

// Eliminar Organización (Solo Roles >= 4)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const roleId = Number(user?.roleID || 0);

  if (roleId < 4) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ ok: false, error: "Missing ID" });

  try {
    // OJO: Esto fallará si hay llaves foráneas sin CASCADE. 
    // Asegúrate de borrar o manejar dependencias si tu esquema lo requiere.
    await prisma.organization.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Error deleting org" });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  // 1. Verificar Rol del solicitante (Requester)
  const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
  const requesterRole = Number(requester?.roleID || 0);

  if (requesterRole < 4) {
    return NextResponse.json({ ok: false, error: "No tienes permisos para realizar esta acción." }, { status: 403 });
  }

  const body = await request.json();
  const { userId, newOrgId } = body;

  if (!userId || !newOrgId) {
    return NextResponse.json({ ok: false, error: "Faltan datos." }, { status: 400 });
  }

  try {
    // 2. Verificar Rol del usuario objetivo (Target)
    // Solo permitimos mover a usuarios con rol 1, 2 o 3.
    const targetUser = await prisma.user.findUnique({ where: { id: Number(userId) } });

    if (!targetUser) {
        return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
    }

    const targetRole = Number(targetUser.roleID || 0);

    if (targetRole >= 4) {
        return NextResponse.json({ ok: false, error: "No puedes cambiar de organización a otro Administrador." }, { status: 403 });
    }

    // 3. Aplicar cambio
    await prisma.user.update({
      where: { id: Number(userId) },
      data: { 
        organizationId: Number(newOrgId) 
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: "Error actualizando usuario" }, { status: 500 });
  }
}