import type { MetadataRoute } from "next";

// PWA : PixelDrop installable sur l'écran d'accueil (mobile + desktop).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PixelDrop — Achète des pixels, dessine le monde",
    short_name: "PixelDrop",
    description:
      "1 000 000 de pixels à conquérir. Pose tes pixels, attache des liens et des messages, défends ton territoire.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b0f1a",
    theme_color: "#0b0f1a",
    icons: [
      { src: "/logo-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/logo-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
