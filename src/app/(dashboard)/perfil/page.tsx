"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function PerfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Mientras se verifica la sesión
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-white">
        <p>Verificando sesión...</p>
      </div>
    );
  }

  // Si no hay sesión activa
  if (!session) {
    router.push("/login");
    return null;
  }

  const user = session.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-white py-10 px-6">
      <div className="max-w-lg mx-auto backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold mb-6">👤 Mi Perfil</h1>

        <div className="space-y-4">
          <div className="bg-white/10 rounded-xl p-4 text-left border border-white/20">
            <p className="text-sm text-gray-300">Nombre:</p>
            <p className="text-lg font-semibold">
              {user?.name || "No especificado"}
            </p>
          </div>

          <div className="bg-white/10 rounded-xl p-4 text-left border border-white/20">
            <p className="text-sm text-gray-300">Correo:</p>
            <p className="text-lg font-semibold">
              {user?.email || "No disponible"}
            </p>
          </div>

          <div className="bg-white/10 rounded-xl p-4 text-left border border-white/20">
            <p className="text-sm text-gray-300">Estado de sesión:</p>
            <p className="text-lg font-semibold text-green-300">Activa</p>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-white/20 px-6 py-2 rounded-lg hover:bg-white/30 transition text-white font-semibold"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
