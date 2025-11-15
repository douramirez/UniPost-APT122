"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import UniPostLogo from "../assets/UniPost.png";

// Sidebar visible en todos los componentes que se encuentren en
// (dashboard)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const menuItems = [
    { href: "/", label: "🏠 Inicio"},
    { href: "/perfil", label: "👤 Perfil" },
    { href: "/composer", label: "✏️ Composer" },
    { href: "/metricas", label: "📊 Métricas" },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-fuchsia-700 text-white">
      {/* Sidebar */}
      <aside
        className={`${
          open ? "w-60" : "w-20"
        } flex flex-col justify-between p-6 transition-all duration-300 backdrop-blur-xl bg-white/10 border-r border-white/20 shadow-lg`}
      >
        <div>

          {/* Título o ícono */}
          <div className="flex items-center gap-3 mb-8">
            <Image
                src={UniPostLogo}
                alt="UniPost Logo"
                width={48} 
                height={48} 
                className="h-8 w-8" 
              />
            <h1
              className={`text-2xl font-bold tracking-wide transition-all ${
                open ? "opacity-100" : "opacity-0 w-0"
              }`}
            >
              UniPost
            </h1>
          </div>

          {/* Menú */}
          <nav className="space-y-2 mt-10">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 rounded-lg transition ${
                  pathname === item.href
                    ? "bg-white/25 font-semibold shadow"
                    : "hover:bg-white/10"
                }`}
              >
                {open ? item.label : item.label.charAt(0)}
              </Link>
            ))}
          </nav>
        </div>

        {/* Cierre de sesión */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-6 w-full bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition"
        >
          {open ? "🚪 Cerrar sesión" : "🚪"}
        </button>
      </aside>

      {/* Contenido dinámico */}
      <main className="flex-1 p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
