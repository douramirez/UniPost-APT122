import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "UniPost",
  description: "Gestión unificada de publicaciones",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">
        {children}
        <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  );
}
