import "dotenv/config";
import { defineConfig } from "prisma/config";

// L'outil de migration Prisma peut échouer si l'URL contient
// `channel_binding=require` (paramètre accepté par le driver runtime mais pas
// toujours par le connecteur natif de migration). On le retire ici uniquement
// pour la config CLI (db push / migrate). Le runtime garde l'URL d'origine.
function cliUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    return raw;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: cliUrl(process.env["DATABASE_URL"]),
  },
});
