// Prépare la base au moment du build (Vercel), seulement si DATABASE_URL est présent :
//   1. crée / met à jour les tables (prisma db push)
//   2. crée / met à jour le compte administrateur (prisma/seed.ts)
// Ne bloque jamais le build en cas d'échec (l'app démarre, /api/health signale le souci).
import "dotenv/config";
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[db-setup] DATABASE_URL absent — étape ignorée (le build continue).");
  process.exit(0);
}

// 1) Schéma
let schemaOk = false;
try {
  console.log("[db-setup] Application du schéma (prisma db push)…");
  execSync("npx prisma db push", { stdio: "inherit" });
  execSync("npx tsx scripts/mark-schema-version.ts", { stdio: "inherit" });
  console.log("[db-setup] Tables à jour.");
  schemaOk = true;
} catch (err) {
  console.warn(
    "[db-setup] Échec de la création des tables (le build continue) :",
    err && err.message ? err.message : err,
  );
}

// 2) Compte administrateur (seulement si le schéma est en place)
if (schemaOk) {
  try {
    console.log("[db-setup] Création / mise à jour du compte admin…");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  } catch (err) {
    console.warn(
      "[db-setup] Seed admin non effectué (le build continue) :",
      err && err.message ? err.message : err,
    );
  }
}

process.exit(0);
