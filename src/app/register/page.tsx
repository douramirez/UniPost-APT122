"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Validaciones básicas
  const validateEmail = (email: string) => {
    const regex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|[^@]+\.(com|cl))$/;
    return regex.test(email);
  };

  const validateName = (name: string) => {
    return name.trim().length >= 2;
  };

  // 📝 DEFINIMOS LOS REQUISITOS INDIVIDUALES
  // Esto nos permite verificar uno por uno para la lista visual
  const requirements = [
    { label: "Mínimo 8 caracteres", valid: password.length >= 8 },
    { label: "Una letra mayúscula", valid: /[A-Z]/.test(password) },
    { label: "Una letra minúscula", valid: /[a-z]/.test(password) },
    { label: "Un número", valid: /\d/.test(password) },
    { label: "Un carácter especial (@$!%*?&)", valid: /[@$!%*?&]/.test(password) },
  ];

  // Función para validar todo junto al enviar
  const isPasswordValid = () => {
    return requirements.every((req) => req.valid);
  };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!validateEmail(email)) {
      toast.error("❌ El correo debe ser válido (ej. example@gmail.com)");
      setLoading(false);
      return;
    }

    if (!validateName(name)) {
      toast.error("❌ El nombre de usuario debe tener al menos 2 caracteres.");
      setLoading(false);
      return;
    }

    // Verificamos si todos los requisitos se cumplen
    if (!isPasswordValid()) {
      toast.error("❌ La contraseña no cumple con todos los requisitos.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();

    if (data.ok) {
      toast.success("Usuario registrado correctamente ✅");
      router.push(`/verificar?email=${email}`);
    } else {
      if (data.error === "USER_EXISTS") {
        toast.error("❌ Este correo ya está en uso");
      } else {
        toast.error("❌ Error: " + (data.error || "No se pudo registrar"));
      }
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
          placeholder="Nombre de Usuario"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          required
        />

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-2 rounded bg-white/10 border border-white/20 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          required
        />

        {/* ✅ LISTA DE CONDICIONES VISUAL */}
        <div className="mb-6 bg-black/20 p-3 rounded-lg border border-white/10 mt-4">
          <p className="text-xs text-gray-300 mb-2 font-semibold uppercase tracking-wide">
            Requisitos de seguridad:
          </p>
          <ul className="space-y-1">
            {requirements.map((req, index) => (
              <li
                key={index}
                className={`text-sm flex items-center gap-2 transition-all duration-300 ${req.valid ? "text-green-400 font-medium" : "text-gray-400"
                  }`}
              >
                <span>{req.valid ? "✅" : "○"}</span>
                {req.label}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 py-3 rounded font-semibold hover:opacity-90 transition shadow-lg mt-2"
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