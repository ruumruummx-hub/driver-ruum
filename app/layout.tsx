import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/SessionProvider";

export const metadata: Metadata = {
  title: "App para conductores",
  description: "Panel móvil para conductores con viajes, pagos y configuración"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#061b3a"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <SessionProvider />
        {children}
      </body>
    </html>
  );
}
