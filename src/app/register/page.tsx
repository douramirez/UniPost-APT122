"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast"; // Importamos la librería de Toast para mostrar la alerta

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(""); // Estado para la fuerza de la contraseña
  const [passwordValid, setPasswordValid] = useState(false); // Estado para saber si la contraseña es válida
  const router = useRouter();

  // Validación de email (debe ser gmail.com, outlook.com, o cualquier dominio .com, .cl)
  const validateEmail = (email: string) => {
    const regex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|[^@]+\.(com|cl))$/;
    return regex.test(email);
  };

  // Validación de nombre (debe tener al menos dos palabras)
  const validateName = (name: string) => {
    const regex = /^[a-zA-Z]+(\s[a-zA-Z]+)+$/; // Al menos dos palabras separadas por un espacio
    return regex.test(name);
  };

  // Validación de contraseña (debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial)
  const validatePassword = (password: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };

  // Evaluación de la fuerza de la contraseña
  const evaluatePasswordStrength = (password: string) => {
    const lengthCriteria = password.length >= 8;
    const uppercaseCriteria = /[A-Z]/.test(password);
    const lowercaseCriteria = /[a-z]/.test(password);
    const numberCriteria = /\d/.test(password);
    const specialCharCriteria = /[@$!%*?&]/.test(password);

    let strength = "Débil";

    if (lengthCriteria && uppercaseCriteria && lowercaseCriteria && numberCriteria && specialCharCriteria) {
      strength = "Fuerte";
    } else if (lengthCriteria && (uppercaseCriteria || lowercaseCriteria) && numberCriteria) {
      strength = "Media";
    }

    setPasswordStrength(strength);
    setPasswordValid(strength === "Fuerte");
  };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Validar email, nombre y contraseña antes de hacer el fetch
    if (!validateEmail(email)) {
      toast.error("❌ El correo debe ser válido (ej. example@gmail.com, example@outlook.com)");
      setLoading(false);
      return;
    }

    if (!validateName(name)) {
      toast.error("❌ El nombre debe tener al menos dos palabras.");
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      toast.error("❌ La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.");
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
      // Usamos toast para mostrar una alerta en la pantalla
      toast.success("Usuario registrado correctamente ✅");

      // Redirigir a la página de verificación con el email
      router.push(`/verificar?email=${email}`);
    } else {
      toast.error("❌ Error: " + (data.error || "No se pudo registrar"));
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
          onChange={(e) => {
            setPassword(e.target.value);
            evaluatePasswordStrength(e.target.value); // Evaluar fuerza de la contraseña
          }}
          className="w-full p-3 mb-6 rounded bg-white/10 border border-white/20 placeholder-gray-300"
          required
        />

        {/* Mostrar la fuerza de la contraseña */}
        <div className="mb-4">
          <p className={`text-sm ${passwordStrength === "Fuerte" ? "text-green-400" : passwordStrength === "Media" ? "text-yellow-400" : "text-red-400"}`}>
            {passwordStrength === "Débil" ? "Contraseña débil" : passwordStrength === "Media" ? "Contraseña media" : "Contraseña fuerte"}
          </p>
        </div>

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
