"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Metric = {
  id: number | string;
  network: "BLUESKY" | "INSTAGRAM";
  likes: number;
  comments: number;
  shares: number;
  impressions: number | null;
  collectedAt: string | null;
  post: { title: string; text?: string };
};

type BskyProfile = {
  avatar: string | null;
  displayName: string | null;
  handle: string;
  followers: number;
  posts: number;
};

type BskyPostMetric = {
  uri: string;
  text: string;
  createdAt: string | null;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  views: number | null;
  postTitle?: string;
};

type InstagramProfile = {
  username: string;
  name: string | null;
  profilePictureUrl: string | null;
  followers: number | null;
  follows: number | null;
  mediaCount: number | null;
};

type InstagramPostMetric = {
  id: string;
  caption: string | null;
  likeCount: number;
  commentsCount: number;
  shares: number;
  views: number | null;
  createdAt: string | null;
  postTitle?: string;
};

type TabKey = "GENERAL" | "BLUESKY" | "INSTAGRAM";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bskyProfile, setBskyProfile] = useState<BskyProfile | null>(null);
  const [loadingBskyProfile, setLoadingBskyProfile] = useState(true);

  const [igProfile, setIgProfile] = useState<InstagramProfile | null>(null);
  const [loadingIgProfile, setLoadingIgProfile] = useState(true);
  const [igError, setIgError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("GENERAL");

  // Load Bluesky profile stats
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/bsky/profile");
        const data = await res.json();
        if (data.ok) {
          setBskyProfile(data.profile);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingBskyProfile(false);
      }
    })();
  }, []);

  // Load Instagram profile stats
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/instagram/profile");
        const data = await res.json();
        if (data.ok) {
          setIgProfile(data.profile);
        } else {
          setIgError(data.error ?? "No se pudo cargar el perfil de Instagram");
        }
      } catch (e) {
        console.error(e);
        setIgError("Error al cargar el perfil de Instagram");
      } finally {
        setLoadingIgProfile(false);
      }
    })();
  }, []);

  // Load Bluesky + Instagram post metrics
  useEffect(() => {
    (async () => {
      try {
        const allMetrics: Metric[] = [];

        // BLUESKY
        const resBsky = await fetch("/api/bsky/metrics");
        const dataBsky = await resBsky.json();

        if (!dataBsky.ok) {
          setError(dataBsky.error || "No se pudieron cargar las métricas de Bluesky");
        } else {
          const mappedBsky: Metric[] = (dataBsky.posts as BskyPostMetric[]).map(
            (p, idx) => ({
              id: `bsky-${idx}`,
              network: "BLUESKY",
              likes: p.likes,
              comments: p.replies,
              shares: p.reposts,
              impressions: p.views, // null por ahora (Bluesky no expone views reales)
              collectedAt: p.createdAt,
              post: {
                title: p.postTitle && p.postTitle.trim().length
                  ? p.postTitle
                  : p.text
                  ? p.text.slice(0, 50) + (p.text.length > 50 ? "…" : "")
                  : "(sin título)",
                text: p.text,
              },
            })
          );

          allMetrics.push(...mappedBsky);
        }

        // INSTAGRAM
        try {
          const resIg = await fetch("/api/instagram/metrics");
          const dataIg = await resIg.json();

          if (dataIg.ok && Array.isArray(dataIg.posts)) {
            const mappedIg: Metric[] = (dataIg.posts as InstagramPostMetric[]).map(
              (p, idx) => ({
                id: `ig-${idx}`,
                network: "INSTAGRAM",
                likes: p.likeCount,
                comments: p.commentsCount,
                shares: p.shares,
                impressions: p.views,
                collectedAt: p.createdAt,
                post: {
                  title:
                    p.postTitle && p.postTitle.trim().length
                      ? p.postTitle
                      : p.caption
                      ? p.caption.slice(0, 50) +
                        (p.caption.length > 50 ? "…" : "")
                      : "(sin título)",
                  text: p.caption ?? undefined,
                },
              })
            );
            allMetrics.push(...mappedIg);
          } else if (!dataIg.ok) {
            // No matamos todo el dashboard si falla IG, solo anotamos error
            console.error("Error métricas IG:", dataIg.error);
          }
        } catch (e) {
          console.error("Error al cargar métricas de Instagram:", e);
        }

        setMetrics(allMetrics);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Error desconocido");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Datos filtrados según pestaña
  const filteredMetrics =
    activeTab === "GENERAL"
      ? metrics
      : metrics.filter((m) => m.network === activeTab);

  const chartData = Object.values(
    filteredMetrics.reduce((acc: any, m) => {
      if (!acc[m.network])
        acc[m.network] = {
          network: m.network,
          likes: 0,
          comments: 0,
          shares: 0,
        };
      acc[m.network].likes += m.likes;
      acc[m.network].comments += m.comments;
      acc[m.network].shares += m.shares;
      return acc;
    }, {} as Record<string, any>)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-700 to-fuchsia-600 text-white p-10">
      <h1 className="text-4xl font-bold mb-8 text-center">
        📈 Dashboard de Métricas
      </h1>

      {/* Header con perfiles de Bluesky e Instagram */}
      <div className="max-w-5xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bluesky */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg flex items-center gap-4">
          {loadingBskyProfile ? (
            <p className="text-white/70 text-sm">Cargando perfil de Bluesky…</p>
          ) : bskyProfile ? (
            <>
              {bskyProfile.avatar && (
                <img
                  src={bskyProfile.avatar}
                  alt="avatar bluesky"
                  className="w-16 h-16 rounded-full border border-white/30"
                />
              )}
              <div className="flex-1">
                <p className="text-sm uppercase tracking-wide text-white/50">
                  Bluesky
                </p>
                <p className="text-lg font-semibold">
                  {bskyProfile.displayName ?? bskyProfile.handle}
                </p>
                <p className="text-white/70 text-sm">@{bskyProfile.handle}</p>
                <div className="flex gap-6 mt-2 text-sm">
                  <div>
                    <p className="font-bold">{bskyProfile.followers}</p>
                    <p className="text-white/60 text-xs">Seguidores</p>
                  </div>
                  <div>
                    <p className="font-bold">{bskyProfile.posts}</p>
                    <p className="text-white/60 text-xs">Posts</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-red-200 text-sm">
              No se pudo cargar el perfil de Bluesky (¿está vinculada la
              cuenta?).
            </p>
          )}
        </div>

        {/* Instagram */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg flex items-center gap-4">
          {loadingIgProfile ? (
            <p className="text-white/70 text-sm">
              Cargando perfil de Instagram…
            </p>
          ) : igProfile ? (
            <>
              {igProfile.profilePictureUrl && (
                <img
                  src={igProfile.profilePictureUrl}
                  alt="avatar instagram"
                  className="w-16 h-16 rounded-full border border-white/30"
                />
              )}
              <div className="flex-1">
                <p className="text-sm uppercase tracking-wide text-white/50">
                  Instagram
                </p>
                <p className="text-lg font-semibold">
                  {igProfile.name ?? igProfile.username}
                </p>
                <p className="text-white/70 text-sm">@{igProfile.username}</p>
                <div className="flex gap-6 mt-2 text-sm">
                  <div>
                    <p className="font-bold">
                      {igProfile.followers ?? "—"}
                    </p>
                    <p className="text-white/60 text-xs">Seguidores</p>
                  </div>
                  <div>
                    <p className="font-bold">{igProfile.mediaCount ?? "—"}</p>
                    <p className="text-white/60 text-xs">Publicaciones</p>
                  </div>
                </div>
              </div>
            </>
          ) : igError ? (
            <p className="text-red-200 text-sm">{igError}</p>
          ) : (
            <p className="text-red-200 text-sm">
              No se pudo cargar el perfil de Instagram (¿está vinculada la
              cuenta?).
            </p>
          )}
        </div>
      </div>

      {/* Tabs General / Bluesky / Instagram */}
      <div className="max-w-6xl mx-auto mb-6 flex justify-center gap-3">
        {(["GENERAL", "BLUESKY", "INSTAGRAM"] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
              activeTab === tab
                ? "bg-white text-purple-700 border-white"
                : "bg-white/10 border-white/30 text-white/80 hover:bg-white/20"
            }`}
          >
            {tab === "GENERAL"
              ? "General"
              : tab === "BLUESKY"
              ? "Bluesky"
              : "Instagram"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-200">Cargando métricas…</p>
      ) : error && activeTab === "BLUESKY" ? (
        <p className="text-center text-red-200">{error}</p>
      ) : (
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Tabla de métricas */}
          <div className="overflow-x-auto backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">
              📋 Detalle de publicaciones{" "}
              {activeTab === "GENERAL"
                ? "(todas las redes)"
                : activeTab === "BLUESKY"
                ? "(Bluesky)"
                : "(Instagram)"}
            </h2>
            <table className="w-full text-sm text-left text-white/90">
              <thead>
                <tr className="border-b border-white/30 text-white/80">
                  <th className="py-2">Red</th>
                  <th>Publicación</th>
                  <th>❤️ Likes</th>
                  <th>💬 Comentarios</th>
                  <th>🔁 Shares</th>
                  <th>👀 Vistas</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-white/10 hover:bg-white/5"
                  >
                    <td className="py-2 align-top text-xs">
                      {m.network === "BLUESKY" ? "Bluesky" : "Instagram"}
                    </td>
                    <td className="py-2 align-top">
                      <p className="font-semibold">{m.post.title}</p>
                      {m.post.text && (
                        <p className="text-xs text-white/70 mt-1 line-clamp-2">
                          {m.post.text}
                        </p>
                      )}
                    </td>
                    <td>{m.likes}</td>
                    <td>{m.comments}</td>
                    <td>{m.shares}</td>
                    <td>{m.impressions ?? "—"}</td>
                    <td>
                      {m.collectedAt
                        ? new Date(m.collectedAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gráfico */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              📊 Interacciones por red
            </h2>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="network" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.7)",
                      borderRadius: "10px",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.1)" }}
                  />
                  <Bar
                    dataKey="likes"
                    fill="#ffb6ff"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}