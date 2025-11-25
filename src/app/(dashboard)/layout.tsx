// src/app/(dashboard)/layout.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Asegúrate de que esta ruta sea correcta
import DashboardSidebar from "@/components/DashboardSidebar"; // Importamos la parte visual

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verificación en el Servidor (Rápida y Segura)
  const session = await getServerSession(authOptions);

  // 2. Si no hay sesión, patada al login
  if (!session) {
    redirect("/login");
  }

  // 3. Si hay sesión, mostramos la Sidebar y el contenido
  return (
    <DashboardSidebar>
      {children}
    </DashboardSidebar>
  );
}