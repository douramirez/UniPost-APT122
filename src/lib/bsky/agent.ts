import { AtpAgent } from "@atproto/api";

export async function getBskyAgent(identifier: string, password: string) {
  const agent = new AtpAgent({ service: "https://bsky.social" });

  await agent.login({
    identifier, // handle or email
    password,   // app password (NOT normal password)
  });

  return agent;
}
