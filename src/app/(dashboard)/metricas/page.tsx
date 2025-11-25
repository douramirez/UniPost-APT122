// src\app\(dashboard)\metricas\page.tsx

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

// Tipos adaptados a lo que devuelve Prisma
type Metric = {
  id: number | string;
  network: string; // "BLUESKY" | "INSTAGRAM"
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

type InstagramProfile = {
  username: string;
  name: string | null;
  profilePictureUrl: string | null;
  followers: number | null;
  follows: number | null;
  mediaCount: number | null;
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

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Cargar perfil de Bluesky
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

  // Cargar perfil de Instagram
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

  // 🔄 CORRECCIÓN: Cargar métricas DESDE LA BASE DE DATOS LOCAL
  const loadMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/metrics/list"); // Endpoint nuevo
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "No se pudieron cargar las métricas.");
      }

      // Mapear los datos que vienen de Prisma (Metric + Variant + Post) al formato de la UI
      const mappedMetrics: Metric[] = data.metrics.map((m: any) => ({
        id: m.id,
        network: m.network,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        impressions: m.impressions,
        collectedAt: m.collectedAt,
        post: {
          title: m.post?.title || "(Sin título)",
          text: m.post?.body || "", // En Prisma tu modelo se llamaba 'body', en la UI usamos 'text'
        },
      }));

      setMetrics(mappedMetrics);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // Cargar métricas al montar
  useEffect(() => {
    loadMetrics();
  }, []);

  // Función para SINCRONIZAR (Refresh) con APIs externas y actualizar BD
  const handleRefreshMetrics = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);

      const res = await fetch("/api/metrics/refresh", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudieron actualizar las métricas");
      }

      setSyncMessage(
        `Sincronización completada. Procesados: ${data.processed ?? 0}.`
      );

      // Una vez actualizados los datos en la BD, recargamos la lista local
      await loadMetrics();
    } catch (e: any) {
      console.error("Error al actualizar métricas:", e);
      setSyncMessage(e.message ?? "Error al actualizar métricas");
    } finally {
      setSyncing(false);
    }
  };

  // Datos filtrados según pestaña
  const filteredMetrics =
    activeTab === "GENERAL"
      ? metrics
      : metrics.filter((m) => m.network === activeTab);

  // Preparar datos para el gráfico
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

      {/* Botón para actualizar métricas y guardarlas en la BD */}
      <div className="max-w-5xl mx-auto mb-8 flex flex-col md:flex-row items-center justify-center gap-3">
        <button
          onClick={handleRefreshMetrics}
          disabled={syncing}
          className={`px-6 py-3 rounded-full text-sm font-bold border transition flex items-center gap-2 shadow-lg ${
            syncing
              ? "bg-white/20 border-white/40 text-white/70 cursor-wait"
              : "bg-white text-purple-700 border-white hover:bg-purple-50 hover:scale-105"
          }`}
        >
          {syncing ? (
            <>
              <span className="animate-spin">🔄</span> Sincronizando con redes...
            </>
          ) : (
            <>
              <span>🔄</span> Actualizar métricas
            </>
          )}
        </button>
        {syncMessage && (
          <p className="text-xs md:text-sm text-white/90 bg-black/20 px-3 py-2 rounded-lg">
            {syncMessage}
          </p>
        )}
      </div>

      {/* Header con perfiles */}
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
              </div>
            </>
          ) : (
            <p className="text-red-200 text-sm">Perfil no disponible</p>
          )}
        </div>

        {/* Instagram */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg flex items-center gap-4">
          {loadingIgProfile ? (
            <p className="text-white/70 text-sm">Cargando perfil de Instagram…</p>
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
              </div>
            </>
          ) : (
            <p className="text-red-200 text-sm">Perfil no disponible</p>
          )}
        </div>
      </div>

      {/* Tabs */}
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
        <div className="text-center py-20">
          <p className="text-xl text-white/70 animate-pulse">
            Consultando base de datos...
          </p>
        </div>
      ) : metrics.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 max-w-4xl mx-auto">
          <p className="text-xl text-white/80 mb-4">No hay métricas registradas.</p>
          <p className="text-sm text-white/50">
            Presiona el botón "Actualizar métricas" para descargar los datos más recientes.
          </p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Tabla de métricas (BD) */}
          <div className="overflow-x-auto backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">
              📋 Detalle de publicaciones
            </h2>
            <table className="w-full text-sm text-left text-white/90">
              <thead>
                <tr className="border-b border-white/30 text-white/80">
                  <th className="py-2">Red</th>
                  <th>Publicación</th>
                  <th>❤️ Likes</th>
                  <th>💬 Coments</th>
                  <th>🔁 Shares</th>
                  <th>👀 Vistas</th>
                  <th>Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 align-top">
                      <span
                        className={`text-xs px-2 py-1 rounded font-bold ${
                          m.network === "BLUESKY"
                            ? "bg-blue-500/20 text-blue-200"
                            : "bg-pink-500/20 text-pink-200"
                        }`}
                      >
                        {m.network}
                      </span>
                    </td>
                    <td className="py-3 align-top max-w-xs">
                      <p className="font-bold truncate">{m.post.title}</p>
                      {m.post.text && (
                        <p className="text-xs text-white/60 mt-1 line-clamp-2">
                          {m.post.text}
                        </p>
                      )}
                    </td>
                    <td className="py-3 font-mono">{m.likes}</td>
                    <td className="py-3 font-mono">{m.comments}</td>
                    <td className="py-3 font-mono">{m.shares}</td>
                    <td className="py-3 font-mono">{m.impressions ?? "-"}</td>
                    <td className="py-3 text-xs text-white/50">
                      {m.collectedAt
                        ? new Date(m.collectedAt).toLocaleDateString() + " " +
                          new Date(m.collectedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
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
              📊 Interacciones Totales (Base de Datos)
            </h2>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="network" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.1)" }}
                  />
                  <Bar
                    dataKey="likes"
                    name="Likes"
                    fill="#ffb6ff"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="comments"
                    name="Comentarios"
                    fill="#a78bfa"
                    radius={[4, 4, 0, 0]}
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