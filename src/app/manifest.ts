import type { MetadataRoute } from "next";

// PWA : PebbleDrop installable sur l'écran d'accueil (mobile + desktop).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PebbleDrop — Pose ton caillou, laisse ta trace",
    short_name: "PebbleDrop",
    description:
      "1 000 000 de cailloux à poser sur une clairière partagée. 10 offerts, jeu gratuit.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#eef3ea",
    theme_color: "#eef3ea",
    icons: [
      { src: "/logo-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/logo-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
