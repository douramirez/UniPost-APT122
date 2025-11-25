"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import UniPostLogo from "../assets/UniPost.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error === "EMAIL_NOT_VERIFIED") {
      toast.error("Tu correo no está verificado. Revisa tu correo.");
      router.push(`/verificar?email=${email}`);
      setLoading(false);
      return;
    }

    if (res?.ok) {
      router.push("/composer");
    } else {
      toast.error("❌ Error: Credenciales incorrectas");
    }

    setLoading(false);
  }

  return (
    // Agregamos 'flex-col' para apilar el botón y el formulario verticalmente
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 p-4">
      
      {/* 🔙 Botón Volver al Inicio (Ahora centrado arriba) */}
      <Link 
        href="/" 
        className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-all bg-black/10 hover:bg-black/20 px-5 py-2 rounded-full backdrop-blur-sm border border-white/10 text-sm font-medium shadow-lg hover:-translate-y-0.5"
      >
        <span>←</span> Volver al Inicio
      </Link>

      <form
        onSubmit={handleLogin}
        className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 text-white w-full max-w-sm flex flex-col"
      >
        {/* 📛 Logo + UniPost */}
        <div className="flex flex-col items-center justify-center mb-6">
            <div className="bg-white/20 p-3 rounded-2xl shadow-inner mb-3">
                <Image
                    src={UniPostLogo}
                    alt="UniPost Logo"
                    width={64}
                    height={64}
                    className="h-12 w-12 drop-shadow-md"
                />
            </div>
            <h1 className="text-2xl font-black tracking-wide">UniPost</h1>
            <p className="text-white/60 text-sm">Bienvenido de vuelta</p>
        </div>

        {/* Inputs */}
        <div className="space-y-4 mb-6">
            <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/20 border border-white/10 placeholder-gray-400 focus:outline-none focus:border-white/40 focus:bg-black/30 transition"
            required
            />

            <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/20 border border-white/10 placeholder-gray-400 focus:outline-none focus:border-white/40 focus:bg-black/30 transition"
            required
            />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 py-3 rounded-xl font-bold hover:opacity-90 hover:scale-[1.02] transition shadow-lg disabled:opacity-60 disabled:scale-100"
        >
          {loading ? "Ingresando..." : "Iniciar Sesión"}
        </button>

        <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-300">
            ¿No tienes cuenta?{" "}
            <a
                href="/register"
                className="text-white font-semibold hover:underline hover:text-indigo-200 transition"
            >
                Regístrate aquí
            </a>
            </p>
        </div>
      </form>
    </div>
  );
}