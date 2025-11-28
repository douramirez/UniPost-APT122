"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import Image from "next/image";
import { calculateHashtagPerformance, type HashtagStat } from "@/utils/analytics";

// Assets
import BskyIcon from "../../assets/bsky.png";
import IgIcon from "../../assets/ig.png";
import FbIcon from "../../assets/fb.png";

export type Metric = {
  id: number | string;
  network: string;
  likes: number;
  comments: number;
  shares: number;
  impressions: number | null;
  collectedAt: string | null;
  variant?: { date_sent: string | null };
  post: { title: string; text?: string };
};

type BskyProfile = { avatar: string | null; displayName: string | null; handle: string; followers: number; posts: number; };
type InstagramProfile = { username: string; name: string | null; profilePictureUrl: string | null; followers: number | null; follows: number | null; mediaCount: number | null; posts: number; };
type FacebookProfile = { name: string; picture: { data: { url: string } }; followers_count: number; fan_count: number; };

type TabKey = "GENERAL" | "BLUESKY" | "INSTAGRAM" | "FACEBOOK";

type SortConfig = { key: keyof Metric | "dateSent"; direction: "asc" | "desc"; };

const ITEMS_PER_PAGE = 10;

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  const [bskyProfile, setBskyProfile] = useState<BskyProfile | null>(null);
  const [igProfile, setIgProfile] = useState<InstagramProfile | null>(null);
  const [fbProfile, setFbProfile] = useState<FacebookProfile | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("GENERAL");
  const [currentPage, setCurrentPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [hashtagStats, setHashtagStats] = useState<HashtagStat[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "dateSent", direction: "desc" });

  // Carga de Perfiles
  useEffect(() => {
    fetch("/api/bsky/profile").then(r => r.json()).then(d => d.ok && setBskyProfile(d.profile)).catch(console.error);
    fetch("/api/instagram/profile").then(r => r.json()).then(d => { if (d.ok && d.profile) setIgProfile({ ...d.profile, posts: d.profile.mediaCount || d.profile.posts || 0 }); }).catch(console.error);
    fetch("/api/facebook/profile").then(r => r.json()).then(d => d.ok && setFbProfile(d.profile)).catch(console.error);
  }, []);

  // Carga de Métricas
  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/metrics/list");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error cargando métricas.");

      const mappedMetrics: Metric[] = data.metrics.map((m: any) => {
        // 🧠 LÓGICA CORREGIDA: Priorizamos el texto de la Variante
        // Si la variante tiene texto (ej: hashtags específicos), usamos ese.
        // Si no, usamos el cuerpo genérico del post.
        const realText = m.Variant?.text || m.post?.body || "";

        return {
          id: m.id,
          network: m.network,
          likes: m.likes,
          comments: m.comments,
          shares: m.shares,
          impressions: m.impressions,
          collectedAt: m.collectedAt,
          variant: { date_sent: m.Variant?.date_sent || null },
          post: {
            title: m.post?.title || "(Sin título)",
            text: realText, // 👈 Aquí está el cambio clave
          },
        };
      });

      setMetrics(mappedMetrics);
      setHashtagStats(calculateHashtagPerformance(mappedMetrics));

    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMetrics(); }, []);

  // Ordenamiento
  const handleSort = (key: SortConfig["key"]) => {
    setSortConfig((current) => ({
      key, direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  // Filtrado y Paginación
  const processedMetrics = useMemo(() => {
    let filtered = activeTab === "GENERAL" ? metrics : metrics.filter(m => m.network === activeTab);

    return filtered.sort((a, b) => {
      let valA: any;
      let valB: any;
      if (sortConfig.key === "dateSent") {
        valA = new Date(a.variant?.date_sent || a.collectedAt || 0).getTime();
        valB = new Date(b.variant?.date_sent || b.collectedAt || 0).getTime();
      } else {
        valA = a[sortConfig.key as keyof Metric];
        valB = b[sortConfig.key as keyof Metric];
      }
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [metrics, activeTab, sortConfig]);

  useEffect(() => setCurrentPage(1), [activeTab]);

  const totalPages = Math.ceil(processedMetrics.length / ITEMS_PER_PAGE);
  const paginatedMetrics = processedMetrics.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const chartData = useMemo(() => {
    return Object.values(processedMetrics.reduce((acc: any, m) => {
      if (!acc[m.network]) acc[m.network] = { network: m.network, likes: 0, comments: 0 };
      acc[m.network].likes += m.likes;
      acc[m.network].comments += m.comments;
      return acc;
    }, {} as Record<string, any>));
  }, [processedMetrics]);

  const handleRefreshMetrics = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const res = await fetch("/api/metrics/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error("Error al sincronizar");
      setSyncMessage(`✅ Completado. Procesados: ${data.processed}.`);
      await loadMetrics();
    } catch (e: any) {
      setSyncMessage("❌ " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const SortIcon = ({ colKey }: { colKey: SortConfig["key"] }) => {
    if (sortConfig.key !== colKey) return <span className="text-slate-200/20 ml-1 text-xs">↕</span>;
    return <span className="text-slate-200 ml-1 text-xs">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center tracking-tight">📈 Centro de Métricas</h1>

      <div className="max-w-5xl mx-auto mb-16 flex flex-col md:flex-row items-center justify-center gap-6">
        <button onClick={handleRefreshMetrics} disabled={syncing} className={`px-8 py-3 rounded-full text-sm font-bold border transition flex items-center gap-3 shadow-xl transform hover:scale-105 active:scale-95 ${syncing ? "bg-white/5 border-white/5 text-slate-200/50 cursor-wait" : "bg-white text-indigo-900 border-transparent hover:bg-indigo-50"}`}>
          {syncing ? <span className="animate-spin text-lg">↻</span> : <span className="text-lg">🔄</span>}
          {syncing ? "Sincronizando..." : "Actualizar datos"}
        </button>
        {syncMessage && <span className="text-sm bg-black/40 px-4 py-2 rounded-lg border border-white/10 animate-in fade-in slide-in-from-bottom-2">{syncMessage}</span>}
      </div>

      {/* PERFILES */}
      <div className="max-w-7xl mx-auto mb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Bluesky */}
        <div className="relative bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl backdrop-blur-sm overflow-hidden group hover:bg-white/10 transition duration-300">
          <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none group-hover:opacity-20 transition transform group-hover:scale-110"><Image src={BskyIcon} alt="logo" width={120} height={120} /></div>
          <div className="relative flex items-center gap-5 z-10">
            {bskyProfile ? (
              <>
                <div className="w-20 h-20 shrink-0 rounded-full border-2 border-sky-400 p-1"><img src={bskyProfile.avatar || ""} className="w-full h-full rounded-full object-cover bg-black/20" alt="Bluesky" /></div>
                <div className="min-w-0 flex-1"><p className="text-xs uppercase text-sky-300 font-bold tracking-wider mb-1">Bluesky</p><p className="font-bold text-xl leading-tight truncate">{bskyProfile.displayName}</p><p className="text-sm opacity-60 truncate mb-3">@{bskyProfile.handle}</p><div className="flex gap-4 text-xs font-mono bg-black/20 inline-flex px-3 py-1.5 rounded-lg"><span>👥 {bskyProfile.followers}</span><span>📝 {bskyProfile.posts}</span></div></div>
              </>
            ) : <div className="w-full text-center py-4 opacity-50">Bluesky no conectado</div>}
          </div>
        </div>
        {/* Instagram */}
        <div className="relative bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl backdrop-blur-sm overflow-hidden group hover:bg-white/10 transition duration-300">
          <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none group-hover:opacity-20 transition transform group-hover:scale-110"><Image src={IgIcon} alt="logo" width={120} height={120} /></div>
          <div className="relative flex items-center gap-5 z-10">
            {igProfile ? (
              <>
                <div className="w-20 h-20 shrink-0 rounded-full border-2 border-pink-500 p-1"><img src={igProfile.profilePictureUrl || ""} className="w-full h-full rounded-full object-cover bg-black/20" alt="Instagram" /></div>
                <div className="min-w-0 flex-1"><p className="text-xs uppercase text-pink-300 font-bold tracking-wider mb-1">Instagram</p><p className="font-bold text-xl leading-tight truncate">{igProfile.name}</p><p className="text-sm opacity-60 truncate mb-3">@{igProfile.username}</p><div className="flex gap-4 text-xs font-mono bg-black/20 inline-flex px-3 py-1.5 rounded-lg"><span>👥 {igProfile.followers}</span><span>📝 {igProfile.posts}</span></div></div>
              </>
            ) : <div className="w-full text-center py-4 opacity-50">Instagram no conectado</div>}
          </div>
        </div>
        {/* Facebook */}
        <div className="relative bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl backdrop-blur-sm overflow-hidden group hover:bg-white/10 transition duration-300">
          <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none group-hover:opacity-20 transition transform group-hover:scale-110"><Image src={FbIcon} alt="logo" width={120} height={120} /></div>
          <div className="relative flex items-center gap-5 z-10">
            {fbProfile ? (
              <>
                <div className="w-20 h-20 shrink-0 rounded-full border-2 border-blue-500 p-1"><img src={fbProfile.picture?.data?.url || ""} className="w-full h-full rounded-full object-cover bg-black/20" alt="Facebook" /></div>
                <div className="min-w-0 flex-1"><p className="text-xs uppercase text-blue-300 font-bold tracking-wider mb-1">Facebook</p><p className="font-bold text-xl leading-tight truncate">{fbProfile.name}</p><div className="mt-3 flex gap-4 text-xs font-mono bg-black/20 inline-flex px-3 py-1.5 rounded-lg"><span>👥 {fbProfile.followers_count}</span><span>👍 {fbProfile.fan_count}</span></div></div>
              </>
            ) : <div className="w-full text-center py-4 opacity-50">Facebook no conectado</div>}
          </div>
        </div>
      </div>

      {/* HASHTAGS */}
      {hashtagStats.length > 0 && activeTab === "GENERAL" && (
        <div className="max-w-7xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">#️⃣ Desempeño de Hashtags <span className="text-xs bg-white/10 px-3 py-1 rounded-full font-normal border border-white/10 tracking-wide">Top 5</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {hashtagStats.slice(0, 5).map((tag, idx) => (
              <div key={idx} className="bg-black/20 border border-white/10 p-5 rounded-2xl hover:bg-white/5 transition hover:-translate-y-1 duration-300 flex flex-col justify-between h-full">
                <p className="text-indigo-300 font-bold truncate text-lg mb-3" title={tag.tag}>#{tag.tag.replace('#', '')}</p>
                <div>
                  <div className="flex justify-between items-end text-sm border-t border-white/10 pt-3 mb-2">
                    <div className="flex flex-col"><span className="text-[10px] opacity-50 uppercase font-bold tracking-wider">Likes</span><span className="font-mono text-pink-200 text-lg">{tag.totalLikes}</span></div>
                    <div className="flex flex-col items-end"><span className="text-[10px] opacity-50 uppercase font-bold tracking-wider">Posts</span><span className="text-xs bg-white/10 px-2 py-1 rounded font-mono">{tag.postsCount}</span></div>
                  </div>
                  {tag.totalComments > 0 && <div className="text-xs text-indigo-300/70 text-right">+ {tag.totalComments} comentarios</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-wrap justify-center gap-4">
        {(["GENERAL", "BLUESKY", "INSTAGRAM", "FACEBOOK"] as TabKey[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-2.5 rounded-full text-sm font-bold border transition duration-300 ${activeTab === tab ? "bg-white text-indigo-900 border-white shadow-glow transform scale-105" : "bg-white/5 border-white/10 text-slate-200/60 hover:bg-white/10 hover:text-slate-200"}`}>{tab === "GENERAL" ? "General" : tab.charAt(0) + tab.slice(1).toLowerCase()}</button>
        ))}
      </div>

      {/* LISTA Y PAGINACIÓN */}
      {loading ? <div className="text-center py-32 animate-pulse opacity-50">Cargando datos...</div> : metrics.length === 0 ? (
        <div className="text-center py-32 bg-white/5 rounded-3xl border border-white/10 max-w-4xl mx-auto border-dashed"><p className="text-xl opacity-70">No hay datos disponibles.</p></div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-xl">
            <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-2xl font-bold">📋 Publicaciones Recientes</h2>
              <span className="text-xs text-slate-200/40 uppercase font-bold tracking-wider">Mostrando {paginatedMetrics.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-200/90">
                <thead>
                  <tr className="bg-black/20 text-slate-200/50 uppercase text-xs tracking-wider font-bold cursor-pointer select-none">
                    <th className="py-5 px-8">Red Social</th>
                    <th className="py-5 px-8 w-1/3">Contenido</th>
                    <th className="py-5 px-8 text-center hover:text-slate-200 transition" onClick={() => handleSort("likes")}>Likes <SortIcon colKey="likes" /></th>
                    <th className="py-5 px-8 text-center hover:text-slate-200 transition" onClick={() => handleSort("comments")}>Comentarios <SortIcon colKey="comments" /></th>
                    <th className="py-5 px-8 text-right hover:text-slate-200 transition" onClick={() => handleSort("dateSent")}>Fecha Publicación <SortIcon colKey="dateSent" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedMetrics.map((m) => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-5 px-8">
                        <span className={`text-[11px] font-extrabold px-3 py-1.5 rounded-lg tracking-wide shadow-sm ${m.network === "BLUESKY" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" : m.network === "INSTAGRAM" ? "bg-pink-500/20 text-pink-300 border border-pink-500/30" : m.network === "FACEBOOK" ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" : "bg-gray-700 text-gray-300"}`}>{m.network}</span>
                      </td>
                      <td className="py-5 px-8">
                        <p className="font-bold truncate text-slate-200 group-hover:text-indigo-200 transition">{m.post.title}</p>
                        <p className="text-xs opacity-50 line-clamp-1 mt-1">{m.post.text}</p>
                      </td>
                      <td className="py-5 px-8 text-center font-mono text-pink-200 font-bold text-base">{m.likes}</td>
                      <td className="py-5 px-8 text-center font-mono text-indigo-200 font-bold text-base">{m.comments}</td>
                      <td className="py-5 px-8 text-right text-xs opacity-40 font-mono">
                        {(m.variant?.date_sent || m.collectedAt) ? new Date(m.variant?.date_sent || m.collectedAt!).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-6 border-t border-white/10 flex justify-center items-center gap-6 bg-black/20">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-sm px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition font-medium border border-white/10">◀ Anterior</button>
                <span className="text-sm font-mono text-slate-200/60 bg-black/30 px-4 py-1 rounded-full border border-white/5">Página {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="text-sm px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition font-medium border border-white/10">Siguiente ▶</button>
              </div>
            )}
          </div>

          {/* GRÁFICO */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl h-[450px]">
            <h3 className="text-xl font-bold mb-6 text-center opacity-90">Comparativa de Interacciones</h3>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="network" stroke="#ffffff80" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#ffffff80" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #ffffff20", color: "#fff", padding: "12px" }} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                  <Bar dataKey="likes" name="Likes" fill="#f472b6" radius={[6, 6, 0, 0]} barSize={50} />
                  <Bar dataKey="comments" name="Comentarios" fill="#818cf8" radius={[6, 6, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}