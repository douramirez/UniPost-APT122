"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import UniPostLogo from "../assets/UniPost.png";

function VerificarCorreoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailFromURL = searchParams.get("email");

  const [email, setEmail] = useState(emailFromURL || "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false); // Estado para saber si ya enviamos el código
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [isVerified, setIsVerified] = useState(false); // Verificar si está verificado

  useEffect(() => {
    // si no viene email, redirige desde el efecto (no en el render)
    if (!emailFromURL) {
      router.push("/login");
      return;
    }

    setEmail(emailFromURL);

    const checkVerification = async () => {
      const res = await fetch("/api/auth/check-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailFromURL }),
      });

      const json = await res.json();
      if (json.ok && json.isVerified) {
        setIsVerified(true);
        router.push("/login");
      }
    };

    checkVerification();
  }, [emailFromURL, router]);

  if (!emailFromURL || isVerified) return null;

  async function sendCode() {
    if (sent) {
      toast.success("📩 Código reenviado. Revisa tu bandeja de entrada.");
      setLoadingSend(true);

      await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setLoadingSend(false);
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
      setSent(true);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-xl text-slate-200">
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
        </div>

        <h1 className="text-3xl font-bold mb-6 text-center">Verificar correo</h1>

        <input
          type="email"
          value={email}
          disabled
          className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 text-slate-200"
        />

        {!sent && (
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
              className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 text-slate-200 text-center text-xl tracking-widest"
            />

            <button
              onClick={verifyCode}
              disabled={loadingVerify}
              className="w-full bg-blue-500 hover:bg-blue-600 py-3 rounded font-semibold"
            >
              {loadingVerify ? "Verificando..." : "Verificar correo"}
            </button>

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

        <p className="text-center mt-6 text-slate-200/70 text-sm">
          Si no encuentras el correo, revisa tu carpeta de spam.
        </p>
      </div>
    </div>
  );
}

// 👉 Wrapper con Suspense (lo que Next te exige)
export default function VerificarCorreo() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-slate-200">
          Cargando verificación...
        </div>
      }
    >
      <VerificarCorreoContent />
    </Suspense>
  );
}
