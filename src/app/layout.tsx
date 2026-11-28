import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Coaching", template: "%s · Coaching" },
  description: "Gestión de clientes: nutrición, entrenamiento y seguimiento",
  robots: { index: false, follow: false }, // datos privados: que no lo indexen buscadores
};

export const viewport: Viewport = { themeColor: "#0b0b0c" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="oscuro h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
