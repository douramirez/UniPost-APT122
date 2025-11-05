import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "UniPost",
  description: "Gestión unificada de publicaciones",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
