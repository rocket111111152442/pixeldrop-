import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redactError } from "@/lib/security";

export const dynamic = "force-dynamic";

// Diagnostic de déploiement : variables manquantes, état de la base.
// Ne renvoie que des booléens — jamais les valeurs des secrets.
export async function GET() {
  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    AUTH_SECRET: !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    AUTH_URL: process.env.AUTH_URL || process.env.NEXTAUTH_URL || null,
    google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    microsoft: !!(
      process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
    ),
    apple: !!(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    adminEmailSet: !!process.env.ADMIN_EMAIL,
  };

  let database: { ok: boolean; tables: boolean; schemaVersion?: string; error?: string } = {
    ok: false,
    tables: false,
  };

  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      try {
        await prisma.user.count();
        let schemaVersion = "1";
        try {
          const s = await prisma.setting.findUnique({ where: { key: "schema_version" } });
          schemaVersion = s?.value ?? "1";
        } catch {
          schemaVersion = "1";
        }
        database = { ok: true, tables: true, schemaVersion };
      } catch {
        database = { ok: true, tables: false };
      }
    } catch (e) {
      database = { ok: false, tables: false, error: redactError(e) };
    }
  } else {
    database = { ok: false, tables: false, error: "DATABASE_URL manquant" };
  }

  const ready = env.DATABASE_URL && env.AUTH_SECRET && database.ok && database.tables;

  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.AUTH_SECRET) missing.push("AUTH_SECRET");
  if (env.DATABASE_URL && !database.ok) missing.push("Base injoignable (URL incorrecte ?)");
  if (database.ok && !database.tables)
    missing.push("Tables absentes — ouvre /api/setup une fois");
  if (database.tables && database.schemaVersion !== "4")
    missing.push("Schéma à mettre à niveau — ouvre /api/setup une fois");

  return NextResponse.json(
    { ready, missing, env, database },
    { headers: { "Cache-Control": "no-store" } },
  );
}
