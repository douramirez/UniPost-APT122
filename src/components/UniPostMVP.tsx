"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";

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
  id: string;          // client-side uuid
  file: File;
  previewUrl: string;  // object URL for <img>/<video>
  base64: string;      // to send to API
  type: "image" | "video";
  order: number;       // position in carousel (0-based)
};

export default function ComposerPage() {
  const { data: session } = useSession();

  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variants, setVariants] = useState<Variant[]>([
    { network: "INSTAGRAM", text: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [medias, setMedias] = useState<NewMedia[]>([]);

  // 🕒 Campos para agendar
  const [agendar, setAgendar] = useState(false);
  const [zona, setZona] = useState("GMT -3");
  const [hora, setHora] = useState("14:30");


  useEffect(() => {
    fetchPosts();
  }, []);

  function moveMedia(index: number, direction: "left" | "right") {
    setMedias((prev) => {
      const newIndex = index + (direction === "left" ? -1 : 1);
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const arr = [...prev];
      const temp = arr[index];
      arr[index] = arr[newIndex];
      arr[newIndex] = temp;

      // Recalcular order según posición
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

    // 📷 Instagram: máximo 10 medias (imágenes o videos)
    if (hasInstagram && currentMedias.length >= 10) {
      return {
        ok: false,
        reason: "Instagram permite máximo 10 archivos (imágenes o videos).",
      };
    }

    // 🐦 Bluesky rules
    if (hasBluesky) {
      if (isVideo) {
        // 1 video máx, y sin mezclar con imágenes
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
        // imágenes
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

    // 1) Check rules before reading the file
    const check = canAddMedia(selected, medias);
    if (!check.ok) {
      toast.error(check.reason || "No se puede agregar este archivo.");
      // reset input so the same file can be chosen again later
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
        order: medias.length, // goes at the end of the carousel
      };

      setMedias((prev) => [...prev, newMedia]);
      e.target.value = "";
    };
    reader.readAsDataURL(selected);
  }

  function isVideoBase64(base64?: string) {
    return base64?.startsWith("data:video");
  }

  async function fetchPosts() {
    const res = await fetch("/api/posts");
    const json = await res.json();
    if (json.ok) setPosts(json.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      organizationId: 1,
      title,
      body,
      variants,
      medias: medias
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((m) => ({
          base64: m.base64,
          type: m.type,   // "image" | "video"
          order: m.order, // 0-based position in carousel
        })),
      schedule: agendar ? { runAt: hora, timezone: zona } : null,
    };

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (json.ok) {
      toast.success("✅ Publicación creada con éxito");
      setTitle("");
      setBody("");
      setMedias([]);       // 🔄 limpiar lista de medias
      setAgendar(false);
      fetchPosts();
    } else {
      toast.error("❌ Error al crear la publicación");
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

  const statusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-500/10 text-green-300 border border-green-500/30";
      case "SCHEDULED":
        return "bg-yellow-500/10 text-yellow-300 border border-yellow-500/30";
      default:
        return "bg-gray-500/10 text-gray-300 border border-gray-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-white py-10 px-6">
      <div className="max-w-5xl mx-auto">
        {session && (
          <>
            <p className="text-center text-lg text-white mb-4">
              👋 Hola, <span className="font-semibold">{session.user?.name || session.user?.email}</span>
            </p>

            <div className="flex justify-center mb-6 gap-4">
              <a href="/perfil" className="text-sm bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition">Ver perfil</a>
              <a href="/metricas" className="text-sm bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition">Ver métricas</a>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition">Cerrar sesión</button>
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
              <label className="block text-sm mb-2 text-gray-200">📎 Adjuntar imagen o video</label>
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
                  <option>FACEBOOK</option>
                  <option>X</option>
                  <option>BLUESKY</option>
                </select>

                <input
                  value={v.text}
                  onChange={(e) => {
                    const copy = [...variants];
                    copy[i].text = e.target.value;
                    setVariants(copy);
                  }}
                  placeholder="Texto del post"
                  className="flex-1 p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300"
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
            <div className="flex gap-3 items-center">
              <select
                id="newNetwork"
                className="p-3 bg-white/30 border border-white/40 text-gray-900 rounded-lg font-semibold focus:ring-2 focus:ring-purple-400" defaultValue=""
              >
                <option value="" disabled>
                  Selecciona una red
                </option>
                {["INSTAGRAM", "FACEBOOK", "X", "LINKEDIN", "BLUESKY"].map((r) => (
                  <option
                    key={r}
                    value={r}
                    disabled={variants.some((v) => v.network === r)}
                  >
                    {r}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const select = document.getElementById("newNetwork") as HTMLSelectElement;
                  const selected = select.value;
                  if (!selected) return;
                  if (variants.some((v) => v.network === selected)) {
                    toast.error("⚠️ Esa red ya fue agregada");
                    return;
                  }
                  setVariants([...variants, { network: selected, text: "" }]);
                  select.value = "";
                }}
                className="bg-green-400 hover:bg-green-500 px-4 py-2 rounded-lg text-black font-semibold"
              >
                Agregar
              </button>
            </div>
            {/* 🕒 Agendar publicación */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span>¿Agendar?</span>
                <input
                  type="checkbox"
                  checked={agendar}
                  onChange={() => setAgendar(!agendar)}
                  className="w-4 h-4 accent-purple-400"
                />
              </label>
              {agendar && (
                <>
                  <label className="flex items-center gap-2">
                    Zona
                    <select
                      value={zona}
                      onChange={(e) => setZona(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-1"
                    >
                      <option>GMT -3</option>
                      <option>GMT -4</option>
                      <option>GMT -5</option>
                      <option>GMT 0</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    Hora
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-1"
                    />
                  </label>
                </>
              )}
            </div>
            <button
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
            >
              {loading ? "Creando..." : "Crear publicación"}
            </button>
          </form>
        </div>
        {/* 📋 Publicaciones existentes */}
        <div className="space-y-6 mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">📋 Publicaciones existentes</h2>
          {posts.length === 0 ? (
            <p className="text-white/70">No hay publicaciones aún.</p>
          ) : (
            posts.map((p) => {
              const firstMedia =
                p.medias && p.medias.length > 0 ? p.medias[0] : null;

              return (
                <div
                  key={p.id}
                  className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-xl shadow-lg"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold">{p.title}</h3>
                    <span
                      className={`text-sm px-3 py-1 rounded-full ${p.status === "PUBLISHED"
                        ? "bg-green-500/10 text-green-300 border border-green-500/30"
                        : "bg-gray-500/10 text-gray-300 border border-gray-500/30"
                        }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-white/80 mb-4">{p.body}</p>
                  {firstMedia && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/20 bg-white/5 p-2 flex justify-center">
                      {firstMedia.type === "VIDEO" || firstMedia.mime.startsWith("video") ? (
                        <video
                          src={firstMedia.url}
                          controls
                          className="max-h-[250px] rounded-lg object-contain shadow-lg"
                        />
                      ) : (
                        <img
                          src={firstMedia.url}
                          alt="media"
                          className="max-h-[250px] w-auto rounded-lg object-contain shadow-lg"
                        />
                      )}
                    </div>
                  )}
                  {!firstMedia && p.mediaBase64 && (
                    // fallback for very old posts while you migrate
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/20 bg-white/5 p-2 flex justify-center">
                      {p.mediaBase64.startsWith("data:video") ? (
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
                        <div>
                          <p className="font-semibold">{v.network}</p>
                          <p className="text-sm text-gray-200">{v.text}</p>
                          <p className="text-xs text-gray-400">Estado: {v.status ?? "DRAFT"}</p>
                        </div>

                        {v.network === "BLUESKY" && (
                          <button
                            onClick={async () => {
                              const res = await fetch("/api/publish/bluesky", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ postId: p.id, variantId: v.id }),
                              });
                              const data = await res.json();
                              if (data.ok) {
                                toast.success("Publicado en Bluesky ✅");

                                // 🔄 update local state without refresh
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
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md ${v.status === "PUBLISHED"
                              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white cursor-default"
                              : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white active:scale-95"
                              }`}
                          >
                            {v.status === "PUBLISHED" ? "Publicado ✅" : "Publicar"}
                          </button>
                        )}
                        {v.network === "INSTAGRAM" && (
                          <button
                            onClick={async () => {
                              const res = await fetch("/api/publish/instagram", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ postId: p.id, variantId: v.id }),
                              });
                              const data = await res.json();

                              console.log("📌 IG publish response:", data);

                              if (!data.ok) {
                                toast.error("Error al publicar en Instagram: " + data.error);
                              }
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
                              }
                              else {
                                toast.error("Error al publicar en Instagram: " + data.error);
                              }
                            }}
                            disabled={v.status === "PUBLISHED"}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md ${v.status === "PUBLISHED"
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