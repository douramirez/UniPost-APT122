"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function VerificarCorreo() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailFromURL = searchParams.get("email");

  // Si el email no existe, redirigir al login
  if (!emailFromURL) {
    router.push("/login");
  }

  const [email, setEmail] = useState(emailFromURL || "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);  // Estado para saber si ya enviamos el código
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [isVerified, setIsVerified] = useState(false);  // Verificar si está verificado

  useEffect(() => {
    if (emailFromURL) setEmail(emailFromURL);

    // Verificar si el correo ya está verificado
    const checkVerification = async () => {
      const res = await fetch("/api/auth/check-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      if (json.ok && json.isVerified) {
        // Si está verificado, redirigir al login
        setIsVerified(true);
        router.push("/login");
      }
    };

    if (emailFromURL) {
      checkVerification();
    }
  }, [emailFromURL, router]);

  async function sendCode() {
    if (sent) {
      toast.success("📩 Código Reenviado. Revisa tu bandeja de entrada.");
      setLoadingSend(true);

    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
      return;
    }

    setLoadingSend(true);

    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await res.json();
    if (json.ok) {
      toast.success("📩 Código enviado. Revisa tu bandeja de entrada.");
      setSent(true); // Actualiza el estado para que el código haya sido enviado
    } else {
      toast.error("No se pudo enviar el código.");
    }

    setLoadingSend(false);
  }

  async function verifyCode() {
    setLoadingVerify(true);

    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const json = await res.json();

    if (json.ok) {
      toast.success("🎉 Correo verificado.");

      setTimeout(() => {
        router.push("/composer");
      }, 1000);
    } else {
      toast.error("Código incorrecto o expirado.");
    }

    setLoadingVerify(false);
  }

  if (isVerified) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-xl text-white">
        <h1 className="text-3xl font-bold mb-6 text-center">Verificar correo</h1>

        <input
          type="email"
          value={email}
          disabled
          className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 text-white"
        />

        {!sent && (
          // El botón para enviar el código solo aparece si no se ha enviado
          <button
            onClick={sendCode}
            disabled={loadingSend}
            className="w-full bg-green-500 hover:bg-green-600 py-3 rounded font-semibold mb-4"
          >
            {loadingSend ? "Enviando..." : "Enviar código"}
          </button>
        )}

        {sent && (
          <>
            <input
              type="text"
              maxLength={6}
              placeholder="Código de 6 dígitos"
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 text-white text-center text-xl tracking-widest"
            />

            <button
              onClick={verifyCode}
              disabled={loadingVerify}
              className="w-full bg-blue-500 hover:bg-blue-600 py-3 rounded font-semibold"
            >
              {loadingVerify ? "Verificando..." : "Verificar correo"}
            </button>

            {/* Botón para reenviar código si ya ha sido enviado */}
            <div className="mt-4 text-center">
              <button
                onClick={sendCode}
                className="text-sm text-blue-500 underline hover:text-blue-700"
              >
                Reenviar código
              </button>
            </div>
          </>
        )}

        <p className="text-center mt-6 text-white/70 text-sm">
          Si no encuentras el correo, revisa tu carpeta de spam.
        </p>
      </div>
    </div>
  );
}
