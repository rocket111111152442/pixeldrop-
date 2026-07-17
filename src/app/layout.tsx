import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PebbleDrop — Pose ton caillou, nourris un cœur",
  description:
    "1 000 000 de cailloux à poser sur une clairière géante. 10 cailloux offerts. 100 % des recettes reversées aux Restos du Cœur.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PebbleDrop",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#eef3ea",
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
