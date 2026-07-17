import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://pixeldrop-beryl.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["", "/carte", "/boutique", "/classement", "/login", "/register"];
  return pages.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === "" || p === "/carte" ? "daily" : "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
}
