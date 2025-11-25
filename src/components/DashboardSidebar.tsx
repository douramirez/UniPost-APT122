// src/components/DashboardSidebar.tsx
"use client"; // 👈 Este se mantiene como cliente

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import UniPostLogo from "@/app/assets/UniPost.png"; // Ajusta la ruta si es necesario

// NOTA: Recibe children para renderizar el contenido dentro
export default function DashboardSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const menuItems = [
    { href: "/", label: "🏠 Inicio" },
    { href: "/perfil", label: "👤 Perfil" },
    { href: "/publicaciones", label: "📂 Publicaciones" },
    { href: "/composer", label: "✏️ Composer" },
    { href: "/equipos", label: "👥 Equipos" },
    { href: "/metricas", label: "📊 Métricas" },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-800 via-purple-700 to-fuchsia-700 text-white">
      {/* Sidebar */}
      <aside
        className={`${
          open ? "w-64" : "w-20"
        } relative flex flex-col justify-between p-4 transition-all duration-300 backdrop-blur-xl bg-white/10 border-r border-white/20 shadow-lg`}
      >
        
        {/* Botón colapsar */}
        <button
          onClick={() => setOpen(!open)}
          className="absolute -right-3 top-10 bg-white text-indigo-900 rounded-full p-1 shadow-md hover:bg-gray-200 transition z-50 border border-indigo-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 transition-transform duration-300 ${!open ? "rotate-180" : ""}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div>
          <div className={`flex items-center gap-3 mb-8 transition-all duration-300 ${!open ? "justify-center" : "px-2"}`}>
            <Image src={UniPostLogo} alt="UniPost Logo" width={40} height={40} className="h-10 w-10 min-w-[40px]" />
            <h1 className={`text-2xl font-bold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${open ? "opacity-100 w-auto" : "opacity-0 w-0"}`}>
              UniPost
            </h1>
          </div>

          <nav className="space-y-2 mt-6">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg transition-all duration-200 group relative ${open ? "px-4 py-3 gap-3" : "justify-center py-3 px-2"} ${pathname === item.href ? "bg-white/25 font-semibold shadow text-white" : "hover:bg-white/10 text-white/80 hover:text-white"}`}
              >
                <span className="text-xl leading-none">{item.label.split(" ")[0]}</span>
                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${open ? "w-auto opacity-100" : "w-0 opacity-0 absolute left-10"}`}>
                  {item.label.split(" ").slice(1).join(" ")}
                </span>
                {!open && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none">
                    {item.label.split(" ").slice(1).join(" ")}
                  </div>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 pt-4">
            <button onClick={() => signOut({ callbackUrl: "/" })} className={`w-full bg-white/10 hover:bg-red-500/80 hover:text-white text-white/90 rounded-lg transition-all flex items-center group ${open ? "px-4 py-2 gap-3" : "justify-center py-2"}`} title="Cerrar Sesión">
            <span className="text-xl">🚪</span>
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${open ? "w-auto opacity-100" : "w-0 opacity-0"}`}>Cerrar sesión</span>
            </button>
        </div>
      </aside>

      {/* Contenido dinámico */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {children}
      </main>
    </div>
  );
}