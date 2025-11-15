"use client";

//Toda configuración del feed en la landing page está aquí

import { useEffect, useState } from "react";

export type FeedVariant = {
  id: number;
  network: "BLUESKY" | "INSTAGRAM" | "FACEBOOK" | "X" | string;
  uri: string;
  post?: {
    title?: string | null;
    body?: string | null;
  };
};

// URI a URL para Bluesky

function blueskyAtUriToUrl(atUri: string): string | null {
  try {
    // "at://did:plc:.../app.bsky.feed.post/3m5mzhho7tx2p"
    const withoutPrefix = atUri.replace("at://", "");
    const [didOrHandle, , rkey] = withoutPrefix.split("/");
    if (!didOrHandle || !rkey) return null;
    return `https://bsky.app/profile/${encodeURIComponent(
      didOrHandle
    )}/post/${rkey}?ref_src=embed`;
  } catch {
    return null;
  }
}

// Embebidos para cada red

function BlueskyEmbed({ uri }: { uri: string }) {
  const postUrl = blueskyAtUriToUrl(uri);

  return (
    <blockquote
      className="bluesky-embed"
      data-bluesky-uri={uri}
      data-bluesky-embed-color-mode="system"
    >
      <p className="text-xs">
        Ver este post en{" "}
        {postUrl ? (
          <a
            href={postUrl}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Bluesky
          </a>
        ) : (
          "Bluesky"
        )}
      </p>
    </blockquote>
  );
}

function InstagramEmbed({ uri }: { uri: string }) {
  return (
    <iframe
      src={uri}
      className="h-[380px] w-full rounded-xl border border-white/20 bg-black/40"
      loading="lazy"
    />
  );
}

function XEmbed({ uri }: { uri: string }) {
  return (
    <iframe
      src={uri}
      className="h-[380px] w-full rounded-xl border border-white/20 bg-black/40"
      loading="lazy"
    />
  );
}

function FacebookEmbed({ uri }: { uri: string }) {
  return (
    <iframe
      src={uri}
      className="h-[380px] w-full rounded-xl border border-white/20 bg-black/40"
      loading="lazy"
    />
  );
}

// Renderizado de cada embebido listado

function renderEmbed(v: FeedVariant) {
  switch (v.network) {
    case "BLUESKY":
      return <BlueskyEmbed uri={v.uri} />;

    case "INSTAGRAM":
      return <InstagramEmbed uri={v.uri} />;

    case "X":
      return <XEmbed uri={v.uri} />;

    case "FACEBOOK":
      return <FacebookEmbed uri={v.uri} />;

    default:
      return (
        <a
          href={v.uri}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl bg-black/30 p-3 text-center text-xs underline"
        >
          Ver publicación
        </a>
      );
  }
}

function FeedCard({ variant }: { variant: FeedVariant }) {
  const title = variant.post?.title;
  const body = variant.post?.body;

  return (
    <article className="mb-4 break-inside-avoid rounded-2xl bg-white/10 p-3 shadow-md backdrop-blur">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {variant.network}
      </div>

      {renderEmbed(variant)}

    </article>
  );
}

// Función exportada para la landing page

export function PublicFeed() {
  const [items, setItems] = useState<FeedVariant[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch feed data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public-feed");
        const json = await res.json();
        if (json.ok) setItems(json.data);
      } catch (e) {
        console.error("Error loading public feed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load Bluesky embed script whenever we have items
  useEffect(() => {
    if (items.length === 0) return;

    const script = document.createElement("script");
    script.src = "https://embed.bsky.app/static/embed.js";
    script.async = true;
    script.charset = "utf-8";

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [items.length]);

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <h2 className="mb-2 text-center text-3xl font-extrabold sm:text-4xl">
        Lo que se está creando con UniPost
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-center text-sm opacity-90">
        Un vistazo a publicaciones reales en distintas redes sociales.
      </p>

      {loading && (
        <p className="text-center text-sm opacity-80">Cargando feed…</p>
      )}

      {!loading && items.length === 0 && (
        <p className="text-center text-sm opacity-80">
          Aún no hay publicaciones públicas para mostrar.
        </p>
      )}

      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {items.map((v) => (
          <FeedCard key={v.id} variant={v} />
        ))}
      </div>
    </section>
  );
}