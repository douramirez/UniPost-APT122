"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status]);

  if (status === "loading")
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-white">
        <p>Cargando...</p>
      </div>
    );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#1f1b39] via-[#251b49] to-[#0a0a14] text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-white/5 backdrop-blur-lg border-r border-white/10 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500">
              <span className="text-white font-bold">U</span>
            </div>
            <h1 className="font-bold text-lg">UniPost</h1>
          </div>

          <nav className="space-y-3">
            <SidebarLink href="/composer" label="Composer" active={pathname === "/composer"} />
            <SidebarLink href="/perfil" label="Perfil" active={pathname === "/perfil"} />
          </nav>
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-sm text-gray-300 mb-2">
            {session?.user?.name || session?.user?.email}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full text-left text-sm text-gray-400 hover:text-white transition"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight">
            {pathname === "/composer" ? "Panel de publicaciones" : "Mi perfil"}
          </h2>
        </header>

        <div className="bg-white/5 rounded-2xl shadow-xl p-8 border border-white/10 backdrop-blur-lg">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`block px-4 py-2 rounded-lg transition ${
        active
          ? "bg-gradient-to-r from-purple-600 to-indigo-500 text-white shadow-lg"
          : "hover:bg-white/10 text-gray-300"
      }`}
    >
      {label}
    </Link>
  );
}
