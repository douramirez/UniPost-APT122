"use client";

import { useSession, signOut } from "next-auth/react";

export default function PerfilPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-700 to-fuchsia-600 text-white p-10">
      <div className="max-w-5xl mx-auto text-center">
        {session ? (
          <>
            {/* Avatar */}
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="avatar"
              className="mx-auto w-28 h-28 rounded-full border-4 border-white/30 shadow-lg mb-4"
            />

            {/* Nombre y datos */}
            <h1 className="text-3xl font-bold mb-1">
              👋 {session.user?.name || session.user?.email}
            </h1>
            <p className="text-white/70 mb-6">
              Community Manager | UniPost
            </p>

            {/* Botones */}
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/composer"
                className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition"
              >
                ✏️ Ir al Composer
              </a>
              <a
                href="/metricas"
                className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition"
              >
                📊 Ver métricas
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition"
              >
                🚪 Cerrar sesión
              </button>
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
