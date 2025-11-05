"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();

    if (data.ok) {
      alert("Usuario registrado correctamente ✅");
      router.push("/login"); // redirige al login después de registrarse
    } else {
      alert("❌ Error: " + (data.error || "No se pudo registrar"));
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white">
      <form
        onSubmit={handleRegister}
        className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 text-white w-96"
      >
        <h1 className="text-3xl font-bold mb-6 text-center">Crear Cuenta</h1>

        <input
          type="text"
          placeholder="Nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 placeholder-gray-300"
          required
        />

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 placeholder-gray-300"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-6 rounded bg-white/10 border border-white/20 placeholder-gray-300"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 py-3 rounded font-semibold hover:opacity-90 transition"
        >
          {loading ? "Creando..." : "Registrarse"}
        </button>

        <p className="text-center mt-4 text-sm text-gray-200">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="underline text-white hover:text-gray-300">
            Inicia sesión aquí
          </a>
        </p>
      </form>
    </div>
  );
}
