import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { AtpAgent } from "@atproto/api";
import { decryptBlueskySecret } from "@/lib/cryptoBluesky";

export async function GET() {
  const session = await getServerSession();
  if (!session)
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  try {
    // 1. Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email ?? "" },
    });
    if (!user) throw new Error("User not found");

    // 2. Get Bluesky access
    const access = await prisma.blueSky_Access.findFirst({
      where: { usuarioId: user.id },
    });
    if (!access) throw new Error("No Bluesky access found");

    const decryptedPassword = decryptBlueskySecret(access.appPassword);

    const agent = new AtpAgent({ service: "https://bsky.social" });
    await agent.login({
      identifier: access.nombreUsuario,
      password: decryptedPassword,
    });

    // 4. Fetch profile
    const response = await agent.app.bsky.actor.getProfile({
      actor: agent.session?.did!,
    });

    return Response.json({
      ok: true,
      profile: {
        avatar: response.data.avatar,
        displayName: response.data.displayName,
        handle: response.data.handle,
        followers: response.data.followersCount,
        posts: response.data.postsCount,
      },
    });
  } catch (err: any) {
    console.error("Bluesky profile error:", err);
    return Response.json({ ok: false, error: err.message }, { status: 400 });
  }
}