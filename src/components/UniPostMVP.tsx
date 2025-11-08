"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";

type Variant = {
  id?: number;
  network: string;
  text: string;
  status?: string;
};

type Post = {
  id: number;
  title: string;
  body: string;
  status: string;
  mediaBase64?: string;
  variants: Variant[];
};

export default function ComposerPage() {
  const { data: session } = useSession();

  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variants, setVariants] = useState<Variant[]>([
    { network: "INSTAGRAM", text: "" },
    { network: "X", text: "" },
    { network: "FACEBOOK", text: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaBase64, setMediaBase64] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaBase64(reader.result as string);
        setPreview(URL.createObjectURL(selected));
      };
      reader.readAsDataURL(selected);
    }
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
      authorId: 1,
      title,
      body,
      variants,
      mediaBase64,
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
      setFile(null);
      setPreview(null);
      setMediaBase64(null);
      fetchPosts();
    } else {
      toast.error("❌ Error al crear la publicación");
    }

    setLoading(false);
  }

  async function publishVariant(variantId: number) {
    const res = await fetch(`/api/variants/${variantId}/publish`, { method: "POST" });
    const json = await res.json();
    if (json.ok) {
      toast.success("🚀 Variante publicada");
      fetchPosts();
    } else {
      toast.error("Error al publicar variante");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Seguro que deseas eliminar esta publicación?")) return;

    const res = await fetch(`/api/posts?id=${id}`, {
      method: "DELETE",
    });
    const json = await res.json();

    if (json.ok) {
      toast.success("🗑️ Publicación eliminada correctamente");
      fetchPosts();
    } else {
      toast.error("❌ No se pudo eliminar la publicación");
    }
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
              <a href="/perfil" className="text-sm bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition">
                Ver perfil
              </a>
              <a href="/metricas" className="text-sm bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition">
                Ver metricas
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
          UniPost <span className="text-purple-200">– Composer</span>
        </h1>

        {/* Crear publicación */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-white">✨ Crear nueva publicación</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Título de la publicación"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <textarea
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Texto principal"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm mb-2 text-gray-200">📎 Adjuntar imagen o video</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4
                           file:rounded-lg file:border-0 file:text-sm file:font-semibold
                           file:bg-purple-500 file:text-white hover:file:bg-purple-600"
              />
              {preview && (
                <div className="mt-3 rounded-xl overflow-hidden border border-white/20 bg-white/5 p-2 flex justify-center">
                  {file && file.type.startsWith("video") ? (
                    <video src={preview} controls className="max-h-[350px] rounded-lg object-contain shadow-lg" />
                  ) : (
                    <img src={preview} alt="preview" className="max-h-[350px] w-auto rounded-lg object-contain shadow-lg" />
                  )}
                </div>
              )}
            </div>

            {variants.map((v, i) => (
              <div key={i} className="flex gap-3">
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
                </select>

                <input
                  value={v.text}
                  onChange={(e) => {
                    const copy = [...variants];
                    copy[i].text = e.target.value;
                    setVariants(copy);
                  }}
                  placeholder="Texto del post"
                  className="flex-1 p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            ))}

            <button
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
            >
              {loading ? "Creando..." : "Crear publicación"}
            </button>
          </form>
        </div>

        {/* Lista de publicaciones */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">📋 Publicaciones existentes</h2>

          {posts.length === 0 ? (
            <p className="text-white/70">No hay publicaciones aún.</p>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold">{p.title}</h3>
                  <span className={`text-sm px-3 py-1 rounded-full ${statusColor(p.status)}`}>
                    {p.status}
                  </span>
                </div>

                <p className="text-white/80 mb-4">{p.body}</p>

                {p.mediaBase64 && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-white/20 bg-white/5 p-2 flex justify-center">
                    {isVideoBase64(p.mediaBase64) ? (
                      <video src={p.mediaBase64} controls className="max-h-[350px] rounded-lg object-contain shadow-lg" />
                    ) : (
                      <img src={p.mediaBase64} alt="media" className="max-h-[350px] w-auto rounded-lg object-contain shadow-lg" />
                    )}
                  </div>
                )}

                <div className="space-y-3 mt-4">
                  {p.variants.map((v, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-lg">
                      <div>
                        <p className="font-semibold">{v.network}</p>
                        <p className="text-sm text-gray-200">{v.text}</p>
                        <p className="text-xs text-gray-400">Estado: {v.status}</p>
                      </div>
                      {v.status !== "PUBLISHED" && (
                        <button
                          onClick={() => publishVariant(v.id!)}
                          className="bg-green-500/80 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition"
                        >
                          Publicar
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
