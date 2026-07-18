import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://pixeldrop-beryl.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PebbleDrop — Pose ton caillou, laisse ta trace",
    template: "%s · PebbleDrop",
  },
  description:
    "PebbleDrop : pose des cailloux sur une clairière géante d'un million de cases et construis une œuvre collective. 10 cailloux offerts, jeu gratuit.",
  applicationName: "PebbleDrop",
  keywords: [
    "PebbleDrop",
    "pebble drop",
    "pebbledrop",
    "cailloux",
    "jeu de cailloux",
    "clairière",
    "pixel war",
    "r/place",
    "oeuvre collective",
    "jeu gratuit",
    "dessin collaboratif",
  ],
  authors: [{ name: "PebbleDrop" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "PebbleDrop",
    url: SITE_URL,
    title: "PebbleDrop — Pose ton caillou, laisse ta trace",
    description:
      "Pose des cailloux sur une clairière géante et construis une œuvre collective. 10 cailloux offerts.",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "PebbleDrop — Pose ton caillou, laisse ta trace",
    description:
      "Pose des cailloux sur une clairière géante et construis une œuvre collective. 10 cailloux offerts.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
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
