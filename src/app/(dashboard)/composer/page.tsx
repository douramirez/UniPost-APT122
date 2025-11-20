"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UniPostMVP from "@/components/UniPostMVP";

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-white text-lg">
        Verificando sesión...
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  // Si hay sesión activa, muestra tu componente principal
  return <UniPostMVP />;
}
