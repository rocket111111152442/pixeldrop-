// Applique le schéma Prisma à la base au moment du build (Vercel), mais
// seulement si DATABASE_URL est présent. Ne bloque jamais le build en cas d'échec.
import "dotenv/config";
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[db-push] DATABASE_URL absent — étape ignorée (le build continue).");
  process.exit(0);
}

try {
  console.log("[db-push] Application du schéma à la base (prisma db push)…");
  execSync("prisma db push --skip-generate", { stdio: "inherit" });
  console.log("[db-push] Tables à jour.");
} catch (err) {
  console.warn(
    "[db-push] Impossible d'appliquer le schéma (le build continue) :",
    err && err.message ? err.message : err,
  );
  // On ne fait pas échouer le build : l'app démarre, /api/health signalera le souci.
  process.exit(0);
}
