//Publicar solo texto (PRUEBAS)
import { AtpAgent } from "@atproto/api";

export async function postToBlueSky({ identifier, password, text }: {
  identifier: string;  // email o handle de cuenta
  password: string;    // app password
  text: string;
}) {
  const agent = new AtpAgent({ service: "https://bsky.social" });

  await agent.login({ identifier, password });

  const did = agent.session?.did; // User's DID after login
  if (!did) throw new Error("No DID found. Login may have failed.");
  
  return await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: "app.bsky.feed.post",
    record: {
      $type: "app.bsky.feed.post",
      text,
      createdAt: new Date().toISOString(),
    },
  });
}

