import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Devis BTP Togo",
  description: "Devis estimatifs de travaux de bâtiment en F CFA – maçonnerie, carrelage, ferraillage, menuiserie.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Devis BTP", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a1f44",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="text-nuit-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
