import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PixelDrop — Achète des pixels, dessine le monde",
  description:
    "1 000 000 de pixels à conquérir. Reçois 10 pixels gratuits, choisis ta couleur, pose des liens et des messages, achète des packs et des bombes.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PixelDrop",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0f1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
