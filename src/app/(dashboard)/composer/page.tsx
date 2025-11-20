"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";  // Asegúrate de importar useEffect
import UniPostMVP from "@/components/UniPostMVP";

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Si el estado es "unauthenticated", redirigir al login
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);  // Se ejecuta cuando `status` cambia

  if (status === "loading") {
    // Mientras la sesión se está verificando, no mostrar nada
    return null; // No renderizamos nada, para evitar mostrar la página de composer
  }

  // Si el usuario está autenticado, mostrar el contenido del composer
  return <UniPostMVP />;
}
