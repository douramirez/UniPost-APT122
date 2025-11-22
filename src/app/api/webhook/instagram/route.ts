// app/api/webhook/instagram/route.ts

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Verification failed", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📩 Webhook recibido de Meta:", body);

    // Aquí puedes manejar cada evento según lo necesites
    // Por ejemplo: mensajes, comentarios, cambios en medios, etc.

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    return new Response("Error", { status: 500 });
  }
}