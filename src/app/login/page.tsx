"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    if (res?.ok) router.push("/composer");
    else alert("Credenciales incorrectas");
  }

  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700">
    <form
      onSubmit={handleLogin}
      className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 text-white w-96"
    >
      <h1 className="text-3xl font-bold mb-6 text-center">Iniciar Sesión</h1>

      <input
        type="email"
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 placeholder-gray-300"
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 mb-6 rounded bg-white/10 border border-white/20 placeholder-gray-300"
      />

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 py-3 rounded font-semibold hover:opacity-90 transition"
      >
        Entrar
      </button>

      {/* 🔹 Texto para registrarse */}
      <p className="text-center mt-6 text-sm text-gray-200">
        ¿No tienes cuenta?{" "}
        <a
          href="/register"
          className="text-white font-semibold underline hover:text-indigo-200 transition"
        >
          Regístrate aquí
        </a>
      </p>
    </form>
  </div>
);

}
