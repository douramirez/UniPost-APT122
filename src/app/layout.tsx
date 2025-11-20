import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast"; // Importamos el Toaster

export const metadata = {
  title: "UniPost",
  description: "Gestión unificada de publicaciones",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-center" /> {/* Esto es donde aparecerán las alertas */}
      </body>
    </html>
  );
}
