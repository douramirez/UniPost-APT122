"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";

// --- TIPOS E INTERFACES ---

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

type Post = {
  id: number;
  title: string;
  body: string;
  status: string;
  mediaBase64?: string;
  variants: Variant[];
  medias: Media[];
};

type NewMedia = {
  id: string; 
  file: File;
  previewUrl: string; 
  base64: string; 
  type: "image" | "video";
  order: number; 
};

const ALL_NETWORKS = ["INSTAGRAM", "BLUESKY"] as const;

// 🌎 Zonas horarias para el Scheduler
const TIMEZONES = [
  { label: "Chile/Argentina (GMT-3)", value: "-03:00" },
  { label: "Bolivia/Venezuela (GMT-4)", value: "-04:00" },
  { label: "Perú/Colombia/Ecuador (GMT-5)", value: "-05:00" },
  { label: "México Central (GMT-6)", value: "-06:00" },
  { label: "UTC (GMT+0)", value: "+00:00" },
];

export default function ComposerPage() {
  const { data: session } = useSession();

  // --- ESTADOS ---
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variants, setVariants] = useState<Variant[]>([
    { network: "INSTAGRAM", text: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [medias, setMedias] = useState<NewMedia[]>([]);

  // Estado para el carrusel de imágenes en posts existentes
  const [postMediaIndex, setPostMediaIndex] = useState<{
    [postId: number]: number;
  }>({});

  // 🕒 ESTADOS DEL SCHEDULER
  const [agendar, setAgendar] = useState(false);
  const [fecha, setFecha] = useState(""); // YYYY-MM-DD
  const [hora, setHora] = useState("12:00"); // HH:mm
  const [zona, setZona] = useState("-03:00"); // Offset por defecto

  useEffect(() => {
    fetchPosts();
  }, []);

  // --- FUNCIONES AUXILIARES DE MEDIA ---

  function moveMedia(index: number, direction: "left" | "right") {
    setMedias((prev) => {
      const newIndex = index + (direction === "left" ? -1 : 1);
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const arr = [...prev];
      const temp = arr[index];
      arr[index] = arr[newIndex];
      arr[newIndex] = temp;

      return arr.map((m, idx) => ({ ...m, order: idx }));
    });
  }

  function removeMedia(index: number) {
    setMedias((prev) => {
      const arr = prev.filter((_, i) => i !== index);
      return arr.map((m, idx) => ({ ...m, order: idx }));
    });
  }

  function hasNetwork(network: string) {
    return variants.some((v) => v.network === network);
  }

  function canAddMedia(file: File, currentMedias: NewMedia[]) {
    const isVideo = file.type.startsWith("video");
    const isImage = file.type.startsWith("image");

    if (!isVideo && !isImage) {
      return {
        ok: false,
        reason: "Solo se permiten imágenes o videos.",
      };
    }

    const hasInstagram = hasNetwork("INSTAGRAM");
    const hasBluesky = hasNetwork("BLUESKY");

    const imageCount = currentMedias.filter((m) => m.type === "image").length;
    const videoCount = currentMedias.filter((m) => m.type === "video").length;

    // 📷 Instagram: máximo 10 medias
    if (hasInstagram && currentMedias.length >= 10) {
      return {
        ok: false,
        reason: "Instagram permite máximo 10 archivos (imágenes o videos).",
      };
    }

    // 🐦 Bluesky rules
    if (hasBluesky) {
      if (isVideo) {
        if (videoCount >= 1) {
          return { ok: false, reason: "Bluesky solo permite 1 video." };
        }
        if (imageCount > 0) {
          return {
            ok: false,
            reason: "Bluesky no permite mezclar video con imágenes.",
          };
        }
      } else {
        if (videoCount > 0) {
          return {
            ok: false,
            reason: "Bluesky no permite mezclar imágenes con video.",
          };
        }
        if (imageCount >= 4) {
          return {
            ok: false,
            reason: "Bluesky permite máximo 4 imágenes.",
          };
        }
      }
    }

    return { ok: true };
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const check = canAddMedia(selected, medias);
    if (!check.ok) {
      toast.error(check.reason || "No se puede agregar este archivo.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const isVideo = selected.type.startsWith("video");

      const newMedia: NewMedia = {
        id: crypto.randomUUID(),
        file: selected,
        previewUrl: URL.createObjectURL(selected),
        base64,
        type: isVideo ? "video" : "image",
        order: medias.length,
      };

      setMedias((prev) => [...prev, newMedia]);
      e.target.value = "";
    };
    reader.readAsDataURL(selected);
  }

  function isVideoBase64(base64?: string) {
    return base64?.startsWith("data:video");
  }

  // --- FUNCIONES DE LÓGICA DE POSTS ---

  async function fetchPosts() {
    const res = await fetch("/api/posts");
    const json = await res.json();
    if (json.ok) setPosts(json.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let schedulePayload = null;

    // 🗓️ LÓGICA DE AGENDAMIENTO
    if (agendar) {
        if (!fecha || !hora) {
            toast.error("⚠️ Debes seleccionar fecha y hora para agendar.");
            setLoading(false);
            return;
        }

        // Construimos la fecha ISO 8601 completa: YYYY-MM-DDTHH:mm:ss-03:00
        const isoString = `${fecha}T${hora}:00${zona}`;
        
        const dateCheck = new Date(isoString);
        if (isNaN(dateCheck.getTime())) {
            toast.error("Fecha inválida.");
            setLoading(false);
            return;
        }

        schedulePayload = {
            runAt: dateCheck.toISOString(),
            timezone: zona,
        };
    }

    const payload = {
      organizationId: 1, // Debería ser dinámico en producción
      title,
      body,
      variants,
      medias: medias
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((m) => ({
          base64: m.base64,
          type: m.type,
          order: m.order,
        })),
      schedule: schedulePayload,
    };

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (json.ok) {
      toast.success(agendar ? "📅 Publicación agendada con éxito" : "✅ Publicación creada con éxito");
      setTitle("");
      setBody("");
      setMedias([]);
      setAgendar(false);
      setFecha("");
      setVariants([{ network: "INSTAGRAM", text: "" }]);
      fetchPosts();
    } else {
      toast.error("❌ Error: " + (json.error || "Fallo al crear post"));
    }

    setLoading(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Seguro que deseas eliminar esta publicación?")) return;
    const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) {
      toast.success("🗑️ Publicación eliminada correctamente");
      fetchPosts();
    } else {
      toast.error("❌ No se pudo eliminar la publicación");
    }
  }

  function addVariant() {
    setVariants([...variants, { network: "INSTAGRAM", text: "" }]);
  }

  function removeVariant(index: number) {
    setVariants(variants.filter((_, i) => i !== index));
    setMedias([]);
    toast("Se limpiaron los archivos adjuntos al eliminar una red.", {
      icon: "🧹",
    });
  }

  const handleVariantTextChange = (
    index: number,
    e: ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newVariants = [...variants];
    newVariants[index].text = e.target.value;
    setVariants(newVariants);

    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  
  const handleExistingVariantTextChange = (
    postId: number,
    variantId: number | undefined,
    newText: string
  ) => {
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

  const movePostMedia = (
    postId: number,
    direction: "left" | "right",
    total: number
  ) => {
    setPostMediaIndex((prev) => {
      const current = prev[postId] ?? 0;
      let next =
        direction === "left" ? current - 1 : current + 1;
      if (next < 0) next = 0;
      if (next >= total) next = total - 1;
      return { ...prev, [postId]: next };
    });
  };

  const usedNetworks = variants.map((v) => v.network);
  const availableNetworks = ALL_NETWORKS.filter(
    (net) => !usedNetworks.includes(net)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-white py-10 px-6">
      <div className="max-w-5xl mx-auto">
        {session && (
          <>
            <p className="text-center text-lg text-white mb-4">
              👋 Hola,{" "}
              <span className="font-semibold">
                {session.user?.name || session.user?.email}
              </span>
            </p>
            <div className="flex justify-center mb-6 gap-4">
              <a
                href="/perfil"
                className="text-sm bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition"
              >
                Ver perfil
              </a>
              <a
                href="/metricas"
                className="text-sm bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition"
              >
                Ver métricas
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition"
              >
                Cerrar sesión
              </button>
            </div>
          </>
        )}
        <h1 className="text-4xl font-bold mb-10 text-center tracking-tight">
          Crear nueva publicación
        </h1>

        {/* FORMULARIO */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg mb-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300"
              placeholder="Título de la publicación"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300"
              placeholder="Texto principal"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />

            {/* 📎 Adjuntar imagen o video */}
            <div>
              <label className="block text-sm mb-2 text-gray-200">
                📎 Adjuntar imagen o video
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0 file:text-sm file:font-semibold
                    file:bg-green-500 file:text-white hover:file:bg-green-600"
              />
              {medias.length > 0 && (
                <div className="mt-3 flex gap-3 overflow-x-auto py-2">
                  {medias
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((m, index) => (
                      <div
                        key={m.id}
                        className="relative min-w-[180px] max-w-[200px] border border-white/20 bg-white/5 rounded-xl p-2 flex flex-col items-center"
                      >
                        <span className="absolute top-1 left-2 text-xs bg-black/50 px-2 py-0.5 rounded-full">
                          #{index + 1}
                        </span>

                        {m.type === "video" ? (
                          <video
                            src={m.previewUrl}
                            controls
                            className="max-h-[160px] rounded-lg object-contain mb-2"
                          />
                        ) : (
                          <img
                            src={m.previewUrl}
                            alt={`media-${index}`}
                            className="max-h-[160px] w-auto rounded-lg object-contain mb-2"
                          />
                        )}

                        <div className="flex gap-2 mt-auto">
                          <button
                            type="button"
                            onClick={() => moveMedia(index, "left")}
                            disabled={index === 0}
                            className="px-2 py-1 text-xs rounded bg-white/10 disabled:opacity-40"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMedia(index, "right")}
                            disabled={index === medias.length - 1}
                            className="px-2 py-1 text-xs rounded bg-white/10 disabled:opacity-40"
                          >
                            ▶
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            className="px-2 py-1 text-xs rounded bg-red-500/80 hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 🔁 Redes dinámicas */}
            {variants.map((v, i) => (
              <div key={i} className="flex gap-3 items-center">
                <select
                  value={v.network}
                  onChange={(e) => {
                    const copy = [...variants];
                    copy[i].network = e.target.value;
                    setVariants(copy);
                  }}
                  className="p-3 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-300"
                >
                  <option>INSTAGRAM</option>
                  <option>BLUESKY</option>
                </select>
                <textarea
                  value={v.text}
                  onChange={(e) => handleVariantTextChange(i, e)}
                  placeholder={`Texto para ${v.network}`}
                  rows={1}
                  className="flex-1 p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 resize-none overflow-hidden leading-relaxed"
                />
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(i)}
                    className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg text-sm text-white"
                  >
                    −
                  </button>
                )}
              </div>
            ))}

            {/* 🟩 Selector para nueva red */}
            {availableNetworks.length > 0 && (
              <div className="flex gap-3 items-center">
                <select
                  id="newNetwork"
                  className="p-3 bg-white/30 border border-white/40 text-white rounded-lg focus:ring-2 focus:ring-purple-400"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecciona una red
                  </option>
                  {availableNetworks.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const select = document.getElementById(
                      "newNetwork"
                    ) as HTMLSelectElement;
                    const selected = select.value;
                    if (!selected) return;
                    if (variants.some((v) => v.network === selected)) {
                      toast.error("⚠️ Esa red ya fue agregada");
                      return;
                    }
                    setVariants([
                      ...variants,
                      { network: selected, text: "" },
                    ]);
                    select.value = "";
                  }}
                  className="bg-green-400 hover:bg-green-500 px-4 py-2 rounded-lg text-black font-semibold"
                >
                  Agregar
                </button>
              </div>
            )}

            {/* 📅 SCHEDULER (Agendamiento) */}
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={agendar} 
                    onChange={() => setAgendar(!agendar)} 
                    className="w-5 h-5 accent-purple-400 rounded" 
                />
                <span className="font-bold text-lg">📅 Programar publicación</span>
              </label>
              
              {agendar && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={fecha}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Hora</label>
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Zona Horaria</label>
                    <select
                      value={zona}
                      onChange={(e) => setZona(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value} className="text-black">
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              disabled={loading}
              className="w-full md:w-auto bg-gradient-to-r from-purple-500 to-indigo-500 px-8 py-3 rounded-lg font-bold hover:opacity-90 transition shadow-lg"
            >
              {loading ? "Procesando..." : agendar ? "Agendar Publicación" : "Crear publicación"}
            </button>
          </form>
        </div>

        {/* 📋 Publicaciones existentes */}
        <div className="space-y-6 mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">
            📋 Publicaciones existentes
          </h2>
          {posts.length === 0 ? (
            <p className="text-white/70">No hay publicaciones aún.</p>
          ) : (
            posts.map((p) => {
              const mediaList = p.medias || [];
              const totalMedia = mediaList.length;
              const currentIndex = postMediaIndex[p.id] ?? 0;
              const currentMedia =
                totalMedia > 0
                  ? mediaList[Math.min(Math.max(currentIndex, 0), totalMedia - 1)]
                  : null;
              
              return (
                <div
                  key={p.id}
                  className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-xl shadow-lg"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold">
                      {p.title}
                    </h3>
                    <span
                      className={`text-sm px-3 py-1 rounded-full ${
                        p.status === "PUBLISHED"
                          ? "bg-green-500/10 text-green-300 border border-green-500/30"
                          : p.status === "SCHEDULED"
                          ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/30"
                          : "bg-gray-500/10 text-gray-300 border border-gray-500/30"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-white/80 mb-4">
                    {p.body}
                  </p>
                  
                  {/* Carrusel de medias */}
                  {currentMedia && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/20 bg-white/5 p-2 flex flex-col items-center">
                      {currentMedia.type === "VIDEO" ||
                        currentMedia.mime.startsWith("video") ? (
                        <video
                          src={currentMedia.mediaLocation}
                          controls
                          className="max-h-[250px] rounded-lg object-contain shadow-lg"
                        />
                      ) : (
                        <img
                          src={currentMedia.mediaLocation}
                          alt="media"
                          className="max-h-[250px] w-auto rounded-lg object-contain shadow-lg"
                        />
                      )}
                      {totalMedia > 1 && (
                        <div className="flex items-center gap-3 mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              movePostMedia(p.id, "left", totalMedia)
                            }
                            disabled={(postMediaIndex[p.id] ?? 0) === 0}
                            className="px-2 py-1 text-xs rounded bg-white/10 disabled:opacity-40"
                          >
                            ◀
                          </button>
                          <span className="text-xs text-gray-200">
                            {currentIndex + 1} / {totalMedia}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              movePostMedia(p.id, "right", totalMedia)
                            }
                            disabled={(postMediaIndex[p.id] ?? 0) === totalMedia - 1}
                            className="px-2 py-1 text-xs rounded bg-white/10 disabled:opacity-40"
                          >
                            ▶
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* fallback para posts viejos con mediaBase64 */}
                  {!currentMedia && p.mediaBase64 && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/20 bg-white/5 p-2 flex justify-center">
                      {isVideoBase64(p.mediaBase64) ? (
                        <video
                          src={p.mediaBase64}
                          controls
                          className="max-h-[250px] rounded-lg object-contain shadow-lg"
                        />
                      ) : (
                        <img
                          src={p.mediaBase64}
                          alt="media"
                          className="max-h-[250px] w-auto rounded-lg object-contain shadow-lg"
                        />
                      )}
                    </div>
                  )}

                  {/* Redes asociadas */}
                  <div className="space-y-3 mt-4">
                    {p.variants.map((v, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-lg transition-all duration-200 hover:bg-white/10"
                      >
                        <div className="flex-1 mr-4">
                          <p className="font-semibold">
                            {v.network}
                          </p>
                          {v.status !== "PUBLISHED" ? (
                            <textarea
                              value={v.text}
                              onChange={(e) =>
                                handleExistingVariantTextChange(
                                  p.id,
                                  v.id,
                                  e.target.value
                                )
                              }
                              className="mt-1 w-full text-sm text-gray-100 bg-white/5 border border-white/10 rounded-lg p-2 resize-none"
                              rows={2}
                              placeholder="Texto del post"
                            />
                          ) : (
                            <p className="text-sm text-gray-200 mt-1 whitespace-pre-line">
                              {v.text}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Estado: {v.status ?? "DRAFT"}
                          </p>
                        </div>
                        
                        {/* Botón Publicar Bluesky */}
                        {v.network === "BLUESKY" && (
                          <button
                            onClick={async () => {
                              const res =
                                await fetch(
                                  "/api/publish/bluesky",
                                  {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      postId: p.id,
                                      variantId: v.id,
                                    }),
                                  }
                                );
                              const data = await res.json();
                              if (data.ok) {
                                toast.success("Publicado en Bluesky ✅");
                                setPosts((prev) =>
                                  prev.map((post) =>
                                    post.id === p.id
                                      ? {
                                        ...post,
                                        variants: post.variants.map((varr) =>
                                            varr.id === v.id
                                                ? { ...varr, status: "PUBLISHED", bskyUri: data.uri }
                                                : varr
                                          ),
                                      }
                                      : post
                                  )
                                );
                              } else {
                                toast.error("Error al publicar: " + data.error);
                              }
                            }}
                            disabled={v.status === "PUBLISHED"}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md ${
                              v.status === "PUBLISHED"
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white cursor-default"
                                : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white active:scale-95"
                            }`}
                          >
                            {v.status === "PUBLISHED" ? "Publicado ✅" : "Publicar"}
                          </button>
                        )}

                        {/* Botón Publicar Instagram */}
                        {v.network === "INSTAGRAM" && (
                          <button
                            onClick={async () => {
                              const res =
                                await fetch(
                                  "/api/publish/instagram",
                                  {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      postId: p.id,
                                      variantId: v.id,
                                    }),
                                  }
                                );
                              const data = await res.json();
                              
                              if (data.ok) {
                                toast.success("Publicado en Instagram ✅");
                                setPosts((prev) =>
                                  prev.map((post) =>
                                    post.id === p.id
                                      ? {
                                        ...post,
                                        variants: post.variants.map((varr) =>
                                            varr.id === v.id
                                                ? {
                                                  ...varr,
                                                  status: "PUBLISHED",
                                                  uri: data.uri ?? data.mediaId ?? varr.uri,
                                                }
                                                : varr
                                          ),
                                      }
                                      : post
                                  )
                                );
                              } else {
                                toast.error("Error al publicar en Instagram: " + data.error);
                              }
                            }}
                            disabled={v.status === "PUBLISHED"}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md ${
                              v.status === "PUBLISHED"
                                ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white cursor-default"
                                : "bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-400 hover:to-orange-400 text-white active:scale-95"
                            }`}
                          >
                            {v.status === "PUBLISHED" ? "Publicado ✅" : "Publicar"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Botón eliminar */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-sm bg-red-500/80 hover:bg-red-600 px-4 py-2 rounded-lg transition shadow-md"
                    >
                      🗑️ Eliminar publicación
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}