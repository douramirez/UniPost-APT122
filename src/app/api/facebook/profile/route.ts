import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const GRAPH_VERSION = process.env.FACEBOOK_API_VERSION ?? "v21.0";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  const fbAccess = await prisma.facebook_Access.findFirst({
    where: { userId: user.id, redSocial: 3 },
  });

  if (!fbAccess || !fbAccess.accessToken) {
    return NextResponse.json({ ok: false, error: "No Facebook linked" }, { status: 404 });
  }

  try {
    // Solicitamos datos de la página (la ID 'me' se refiere a la página porque usamos el Page Access Token o el User Token con contexto)
    // Nota: Si guardaste el User Token, 'me' es el usuario. Si guardaste el Page Token, 'me' es la página.
    // Asumiremos que necesitamos ir a /me/accounts para obtener datos frescos o usar el ID si lo guardamos.
    
    // Si guardaste el token de usuario (Long Lived User Token), consultamos las cuentas:
    const accountsRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?access_token=${fbAccess.accessToken}`
    );
    const accountsData = await accountsRes.json();
    
    // Tomamos la primera página (o filtra por nombre si prefieres)
    const page = accountsData.data?.[0];

    if (!page) {
         return NextResponse.json({ ok: false, error: "Page not found in Meta" });
    }

    // Ahora pedimos los detalles de esa página específica (foto, likes, seguidores)
    const fields = "id,name,fan_count,followers_count,picture{url}";
    const pageDetailsRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${page.id}?fields=${fields}&access_token=${page.access_token}`
    );
    const pageDetails = await pageDetailsRes.json();

    return NextResponse.json({
      ok: true,
      profile: {
        name: pageDetails.name,
        followers_count: pageDetails.followers_count,
        fan_count: pageDetails.fan_count,
        picture: pageDetails.picture,
      },
    });

  } catch (error: any) {
    console.error("Facebook Profile Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}