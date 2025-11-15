"use client";

// Sidebar - Visible en todos los componentes dentro del directorio "(dashboard)"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    { href: "/perfil", label: "👤 Perfil" },
    { href: "/composer", label: "✏️ Composer" },
    { href: "/metricas", label: "📊 Métricas" },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-fuchsia-700 text-white">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col justify-between p-6 backdrop-blur-xl bg-white/10 border-r border-white/20 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold mb-8 tracking-wide text-center">
            UniPost
          </h1>
          <nav className="space-y-2">
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
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-6 w-full bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition"
        >
          🚪 Cerrar sesión
        </button>
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
