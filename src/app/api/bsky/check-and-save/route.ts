import { getServerSession } from "next-auth";
import { getBskyAgent } from "@/lib/bsky/agent";
import { prisma } from "@/lib/prisma";
import { encryptBlueskySecret } from "@/lib/cryptoBluesky";

// Envía credenciales del campo para enlazar cuenta
// Si la respuesta es válida, se guardan en la base de datos encriptado.

export async function POST(req: Request) {
  const session = await getServerSession(); // No es obligatorio authOptions aquí
  if (!session) {
    return Response.json({ ok: false, error: "No session found" }, { status: 401 });
  }

  const { identifier, password } = await req.json();

  try {
    // Llama al agente para que recepcione el DID de Bluesky
    const agent = await getBskyAgent(identifier, password);
    const did = agent.session?.did;
    if (!did) throw new Error("No DID returned from Bluesky");

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email ?? "" },
    });

    if (!user) {
      return Response.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const existingAccess = await prisma.blueSky_Access.findFirst({
      where: { usuarioId: user.id },
    });

    const encryptedPassword = encryptBlueskySecret(password);

    if (existingAccess) {
      await prisma.blueSky_Access.update({
        where: { id: existingAccess.id },
        data: {
          nombreUsuario: identifier,
          appPassword: encryptedPassword,
        },
      });
    } else {
      await prisma.blueSky_Access.create({
        data: {
          usuarioId: user.id,
          redSocialId: 1,
          nombreUsuario: identifier,
          appPassword: encryptedPassword,
        },
      });
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("Bluesky check error:", err);
    return Response.json({ ok: false, error: err.message }, { status: 400 });
  }
}