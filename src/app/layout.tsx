import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://pixeldrop-beryl.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PebbleDrop — Pose ton caillou, nourris un cœur",
    template: "%s · PebbleDrop",
  },
  description:
    "PebbleDrop : pose des cailloux sur une clairière géante d'un million de cases. 10 cailloux offerts. 100 % des recettes reversées aux Restos du Cœur.",
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
    "Restos du Cœur",
    "don",
    "caritatif",
  ],
  authors: [{ name: "PebbleDrop" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "PebbleDrop",
    url: SITE_URL,
    title: "PebbleDrop — Pose ton caillou, nourris un cœur",
    description:
      "Pose des cailloux sur une clairière géante. 100 % des recettes reversées aux Restos du Cœur.",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "PebbleDrop — Pose ton caillou, nourris un cœur",
    description:
      "Pose des cailloux sur une clairière géante. 100 % des recettes reversées aux Restos du Cœur.",
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
