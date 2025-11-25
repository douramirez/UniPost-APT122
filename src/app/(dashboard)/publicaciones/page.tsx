// src\app\(dashboard)\publicaciones\page.tsx

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

// --- TIPOS ACTUALIZADOS ---
type Variant = {
  id?: number;
  network: string;
  text: string;
  status?: string;
  uri?: string;
  bskyUri?: string;
};

type Media = {
  id: number;
  url: string;
  type: "IMAGE" | "VIDEO";
  mime: string;
  mediaLocation: string;
};

// Agregamos el tipo Schedule
type Schedule = {
  runAt: string;
  timezone: string;
};

type Post = {
  id: number;
  title: string;
  body: string;
  status: string;
  mediaBase64?: string;
  variants: Variant[];
  medias: Media[];
  schedule?: Schedule | null;
};

export default function PublicacionesPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postMediaIndex, setPostMediaIndex] = useState<{ [postId: number]: number }>({});
  
  // Estado para forzar re-render cada minuto y actualizar contadores de tiempo
  const [, setTick] = useState(0);

  useEffect(() => {
    fetchPosts();
    // Timer para actualizar el "tiempo restante" cada minuto
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/posts");
      const json = await res.json();
      if (json.ok) setPosts(json.data);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando publicaciones");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Seguro que deseas eliminar esta publicación?")) return;
    const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) {
      toast.success("🗑️ Publicación eliminada");
      fetchPosts();
    } else {
      toast.error("❌ Error al eliminar");
    }
  }

  // --- LÓGICA DE TIEMPO RESTANTE ---
  function getScheduleDisplay(runAt: string) {
    const target = new Date(runAt);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    
    // Formato de hora legible (ej: 14:30)
    const timeStr = target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = target.toLocaleDateString();

    if (diffMs <= 0) {
      return { text: `${dateStr} ${timeStr}`, remaining: "Procesando..." };
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    let remaining = "";
    if (diffMins < 60) {
        remaining = `Faltan ${diffMins} min`;
    } else {
        remaining = `Faltan ${diffHours} hrs`; // Opcional: agregar minutos residuales
    }

    return { text: `${dateStr} a las ${timeStr}`, remaining };
  }

  const handleExistingVariantTextChange = (postId: number, variantId: number | undefined, newText: string) => {
    if (!variantId) return;
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              variants: post.variants.map((v) =>
                v.id === variantId ? { ...v, text: newText } : v
              ),
            }
          : post
      )
    );
  };

  const movePostMedia = (postId: number, direction: "left" | "right", total: number) => {
    setPostMediaIndex((prev) => {
      const current = prev[postId] ?? 0;
      let next = direction === "left" ? current - 1 : current + 1;
      if (next < 0) next = 0;
      if (next >= total) next = total - 1;
      return { ...prev, [postId]: next };
    });
  };

  function isVideoBase64(base64?: string) {
    return base64?.startsWith("data:video");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white p-10">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">📋 Biblioteca de Publicaciones</h1>
          <div className="flex gap-4">
             <a href="/composer" className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-bold transition">
                + Crear Nueva
             </a>
             <a href="/perfil" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition">
                Cuentas Enlazadas
             </a>
          </div>
        </div>

        {loading ? (
           <p className="text-center animate-pulse">Cargando publicaciones...</p>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xl text-white/70">No hay publicaciones aún.</p>
            <a href="/composer" className="text-purple-300 underline mt-2 block">Crea la primera aquí</a>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((p) => {
              const mediaList = p.medias || [];
              const totalMedia = mediaList.length;
              const currentIndex = postMediaIndex[p.id] ?? 0;
              const currentMedia = totalMedia > 0 
                ? mediaList[Math.min(Math.max(currentIndex, 0), totalMedia - 1)] 
                : null;
              
              // Calcular info de agenda si existe
              const scheduleInfo = p.schedule ? getScheduleDisplay(p.schedule.runAt) : null;

              return (
                <div key={p.id} className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-xl shadow-lg">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
                    <h3 className="text-xl font-bold">{p.title}</h3>
                    
                    <div className="flex items-center gap-3">
                        {/* 🕒 MOSTRAR INFO DE AGENDAMIENTO */}
                        {p.status === "SCHEDULED" && scheduleInfo && (
                            <div className="text-right">
                                <div className="text-yellow-300 text-sm font-bold flex items-center gap-1">
                                    🕒 {scheduleInfo.text}
                                </div>
                                <div className="text-yellow-200/70 text-xs">
                                    ({scheduleInfo.remaining})
                                </div>
                            </div>
                        )}

                        <span className={`text-sm px-3 py-1 rounded-full border ${
                            p.status === "PUBLISHED" ? "bg-green-500/10 text-green-300 border-green-500/30" : 
                            p.status === "SCHEDULED" ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" :
                            "bg-gray-500/10 text-gray-300 border-gray-500/30"
                        }`}>
                            {p.status}
                        </span>
                    </div>
                  </div>
                  
                  <p className="text-white/80 mb-4 whitespace-pre-wrap">{p.body}</p>
                  
                  {/* MEDIA VIEWER */}
                  {currentMedia && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/20 bg-black/40 p-2 flex flex-col items-center">
                      {currentMedia.type === "VIDEO" || currentMedia.mime.startsWith("video") ? (
                        <video src={currentMedia.mediaLocation} controls className="max-h-[300px] rounded-lg object-contain" />
                      ) : (
                        <img src={currentMedia.mediaLocation} alt="media" className="max-h-[300px] w-auto rounded-lg object-contain" />
                      )}
                      
                      {totalMedia > 1 && (
                        <div className="flex items-center gap-3 mt-3">
                          <button onClick={() => movePostMedia(p.id, "left", totalMedia)} disabled={currentIndex === 0} className="px-3 py-1 bg-white/20 rounded disabled:opacity-30">◀</button>
                          <span className="text-xs text-gray-300">{currentIndex + 1} / {totalMedia}</span>
                          <button onClick={() => movePostMedia(p.id, "right", totalMedia)} disabled={currentIndex === totalMedia - 1} className="px-3 py-1 bg-white/20 rounded disabled:opacity-30">▶</button>
                        </div>
                      )}
                    </div>
                  )}

                  {!currentMedia && p.mediaBase64 && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/20 bg-black/40 p-2 flex justify-center">
                       {isVideoBase64(p.mediaBase64) ? (
                        <video src={p.mediaBase64} controls className="max-h-[300px]" />
                       ) : (
                        <img src={p.mediaBase64} alt="media" className="max-h-[300px]" />
                       )}
                    </div>
                  )}

                  {/* VARIANTES Y PUBLICAR */}
                  <div className="space-y-3 mt-6">
                    {p.variants.map((v, i) => (
                      <div key={i} className="flex flex-col md:flex-row gap-4 bg-white/5 border border-white/10 p-4 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm uppercase tracking-wider">{v.network}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded ${v.status === "PUBLISHED" ? "bg-green-500/20 text-green-200" : "bg-white/10"}`}>
                                {v.status || "DRAFT"}
                            </span>
                          </div>
                          
                          {v.status !== "PUBLISHED" ? (
                            <textarea
                              value={v.text}
                              onChange={(e) => handleExistingVariantTextChange(p.id, v.id, e.target.value)}
                              className="w-full text-sm text-gray-200 bg-black/20 border border-white/10 rounded p-2 resize-none focus:border-purple-500 outline-none transition"
                              rows={2}
                            />
                          ) : (
                            <p className="text-sm text-gray-300 italic">"{v.text}"</p>
                          )}
                        </div>
                        
                        <div className="flex items-center">
                            {/* BOTÓN BLUESKY */}
                            {v.network === "BLUESKY" && (
                              <button
                                onClick={async () => {
                                  const toastId = toast.loading("Publicando en Bluesky...");
                                  const res = await fetch("/api/publish/bluesky", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ postId: p.id, variantId: v.id }),
                                  });
                                  const data = await res.json();
                                  if (data.ok) {
                                    toast.success("Publicado ✅", { id: toastId });
                                    setPosts(prev => prev.map(pst => pst.id === p.id ? { ...pst, variants: pst.variants.map(va => va.id === v.id ? { ...va, status: "PUBLISHED" } : va) } : pst));
                                  } else {
                                    toast.error("Error: " + data.error, { id: toastId });
                                  }
                                }}
                                disabled={v.status === "PUBLISHED"}
                                className={`px-4 py-2 rounded font-bold text-sm shadow-lg transition ${v.status === "PUBLISHED" ? "bg-gray-600 cursor-not-allowed opacity-50" : "bg-sky-600 hover:bg-sky-500"}`}
                              >
                                {v.status === "PUBLISHED" ? "Publicado" : "Publicar"}
                              </button>
                            )}

                            {/* BOTÓN INSTAGRAM */}
                            {v.network === "INSTAGRAM" && (
                              <button
                                onClick={async () => {
                                  const toastId = toast.loading("Publicando en Instagram...");
                                  const res = await fetch("/api/publish/instagram", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ postId: p.id, variantId: v.id }),
                                  });
                                  const data = await res.json();
                                  if (data.ok) {
                                    toast.success("Publicado ✅", { id: toastId });
                                    setPosts(prev => prev.map(pst => pst.id === p.id ? { ...pst, variants: pst.variants.map(va => va.id === v.id ? { ...va, status: "PUBLISHED" } : va) } : pst));
                                  } else {
                                    toast.error("Error: " + data.error, { id: toastId });
                                  }
                                }}
                                disabled={v.status === "PUBLISHED"}
                                className={`px-4 py-2 rounded font-bold text-sm shadow-lg transition ${v.status === "PUBLISHED" ? "bg-gray-600 cursor-not-allowed opacity-50" : "bg-pink-600 hover:bg-pink-500"}`}
                              >
                                {v.status === "PUBLISHED" ? "Publicado" : "Publicar"}
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end border-t border-white/10 pt-4">
                    <button onClick={() => handleDelete(p.id)} className="text-red-300 hover:text-red-100 text-sm font-semibold transition">
                      🗑️ Eliminar publicación
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}