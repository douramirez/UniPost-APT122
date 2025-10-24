"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

type Variant = {
  id: number;
  network: string;
  text: string;
  status: string;
};

type Post = {
  id: number;
  title: string;
  body: string;
  status: string;
  variants: Variant[];
};

export default function ComposerPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variants, setVariants] = useState([
    { network: "INSTAGRAM", text: "" },
    { network: "FACEBOOK", text: "" },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

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
    };
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (json.ok) {
      toast.success("✅ Publicación creada");
      setTitle("");
      setBody("");
      fetchPosts();
    } else {
      toast.error("❌ Error al crear post");
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

  const statusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "bg-green-500/10 text-green-300 border border-green-500/30";
      case "SCHEDULED": return "bg-yellow-500/10 text-yellow-300 border border-yellow-500/30";
      default: return "bg-gray-500/10 text-gray-300 border border-gray-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-white py-10 px-6">
      <div className="max-w-5xl mx-auto">
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
            />
            <textarea
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Texto principal"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />

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
                  <option>LINKEDIN</option>
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

                <div className="space-y-3">
                  {p.variants.map((v) => (
                    <div key={v.id} className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-lg">
                      <div>
                        <p className="font-semibold">{v.network}</p>
                        <p className="text-sm text-gray-200">{v.text}</p>
                        <p className="text-xs text-gray-400">Estado: {v.status}</p>
                      </div>
                      {v.status !== "PUBLISHED" && (
                        <button
                          onClick={() => publishVariant(v.id)}
                          className="bg-green-500/80 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition"
                        >
                          Publicar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
