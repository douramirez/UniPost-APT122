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
  network: string;
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

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BskyProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Bluesky profile stats
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/bsky/profile");
        const data = await res.json();
        if (data.ok) {
          setProfile(data.profile);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  // Load Bluesky post metrics
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/bsky/metrics");
        const data = await res.json();

        if (!data.ok) {
          setError(data.error || "No se pudieron cargar las métricas");
          return;
        }

        // Mapear respuesta de Bluesky → modelo de la tabla/gráfico
        const mapped: Metric[] = (data.posts as BskyPostMetric[]).map(
          (p, idx) => ({
            id: idx,
            network: "BLUESKY",
            likes: p.likes,
            comments: p.replies,
            shares: p.reposts,
            impressions: p.views, // null por ahora (Bluesky no expone views)
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

        setMetrics(mapped);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Error desconocido");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Agrupar likes por red para el gráfico (ahora solo BLUESKY, pero es escalable)
  const chartData = Object.values(
    metrics.reduce((acc: any, m) => {
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
        📈 Dashboard de Métricas (Bluesky)
      </h1>

      {/* Header con perfil de Bluesky */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center gap-4">
          {loadingProfile ? (
            <p className="text-white/70 text-sm">Cargando perfil de Bluesky…</p>
          ) : profile ? (
            <>
              {profile.avatar && (
                <img
                  src={profile.avatar}
                  alt="avatar"
                  className="w-16 h-16 rounded-full border border-white/30"
                />
              )}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-lg font-semibold">
                  {profile.displayName ?? profile.handle}
                </p>
                <p className="text-white/70 text-sm">@{profile.handle}</p>
                <div className="flex justify-center sm:justify-start gap-6 mt-2 text-sm">
                  <div>
                    <p className="font-bold">{profile.followers}</p>
                    <p className="text-white/60 text-xs">Seguidores</p>
                  </div>
                  <div>
                    <p className="font-bold">{profile.posts}</p>
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
      </div>

      {loading ? (
        <p className="text-center text-gray-200">Cargando métricas…</p>
      ) : error ? (
        <p className="text-center text-red-200">{error}</p>
      ) : (
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Tabla de métricas */}
          <div className="overflow-x-auto backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">
              📋 Detalle de publicaciones
            </h2>
            <table className="w-full text-sm text-left text-white/90">
              <thead>
                <tr className="border-b border-white/30 text-white/80">
                  <th className="py-2">Publicación</th>
                  <th>❤️ Likes</th>
                  <th>💬 Comentarios</th>
                  <th>🔁 Shares</th>
                  <th>👀 Vistas</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-white/10 hover:bg-white/5"
                  >
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
                  <Bar dataKey="likes" fill="#ffb6ff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}