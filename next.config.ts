import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Fixe la racine du workspace (plusieurs lockfiles détectés sur la machine).
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
