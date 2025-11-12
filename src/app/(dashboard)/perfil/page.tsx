"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function PerfilPage() {
  const { data: session } = useSession();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [linked, setLinked] = useState(false);
  const [linkedUser, setLinkedUser] = useState("");

  // 🧩 Fetch Bluesky status when page loads
  useEffect(() => {
    if (!session) return;
    (async () => {
      const res = await fetch("/api/bsky/status");
      const data = await res.json();
      if (data.ok && data.linked) {
        setLinked(true);
        setLinkedUser(data.nombreUsuario);
      }
    })();
  }, [session]);

  async function handleCheckAndSave() {
    setLoading(true);
    setStatus("Verificando credenciales...");

    try {
      const res = await fetch("/api/bsky/check-and-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (data.ok) {
        setStatus("✅ Cuenta Bluesky vinculada correctamente");
        setLinked(true);
        setLinkedUser(identifier);
      } else {
        setStatus("❌ Error: " + (data.error || "Credenciales inválidas"));
      }
    } catch {
      setStatus("⚠️ Error de conexión con el servidor");
    }

    setLoading(false);
  }

  async function handleUnlink() {
    if (!confirm("¿Seguro que quieres desvincular tu cuenta de Bluesky?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/bsky/unlink", { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setLinked(false);
        setLinkedUser("");
        setStatus("🔓 Cuenta Bluesky desvinculada");
      } else {
        setStatus("❌ Error al desvincular");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-700 to-fuchsia-600 text-white p-10">
      <div className="max-w-5xl mx-auto text-center">
        {session ? (
          <>
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="avatar"
              className="mx-auto w-28 h-28 rounded-full border-4 border-white/30 shadow-lg mb-4"
            />

            <h1 className="text-3xl font-bold mb-1">
              👋 {session.user?.name || session.user?.email}
            </h1>
            <p className="text-white/70 mb-6">Community Manager | UniPost</p>

            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <a href="/composer" className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition">
                ✏️ Ir al Composer
              </a>
              <a href="/metricas" className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition">
                📊 Ver métricas
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition"
              >
                🚪 Cerrar sesión
              </button>
            </div>

            {/* 🌤 Bluesky Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">🌤 Vincular cuenta de Bluesky</h2>

              {linked ? (
                <>
                  <p className="text-green-400 font-semibold mb-4">
                    ✅ Ya vinculado como <span className="underline">{linkedUser}</span>
                  </p>
                  <button
                    onClick={handleUnlink}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-600 py-3 rounded font-semibold hover:opacity-90 transition"
                  >
                    {loading ? "Procesando..." : "Desvincular cuenta"}
                  </button>
                </>
              ) : (
                <>
                  <a href="https://bsky.app/settings/app-passwords">
                    <p className="text-white/70 mb-6">Consigue tu clave de aplicación aquí</p>
                  </a>

                  <input
                    type="text"
                    placeholder="Email o handle (ej: user.bsky.social)"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full p-3 mb-3 rounded bg-white/10 border border-white/20 placeholder-gray-300"
                  />
                  <input
                    type="password"
                    placeholder="App Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 placeholder-gray-300"
                  />
                  <button
                    onClick={handleCheckAndSave}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 py-3 rounded font-semibold hover:opacity-90 transition"
                  >
                    {loading ? "Verificando..." : "Check and Save"}
                  </button>
                </>
              )}

              {status && <p className="mt-4 text-sm text-white/80">{status}</p>}
            </div>
          </>
        ) : (
          <p className="text-white/80">
            Inicia sesión para ver tu perfil y tus métricas.
          </p>
        )}
      </div>
    </div>
  );
}