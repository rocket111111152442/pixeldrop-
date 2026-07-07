import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Diagnostic de déploiement : quelles variables manquent, la base répond-elle ?
// Ne renvoie que des booléens (jamais les valeurs des secrets).
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

  let database: { ok: boolean; tables: boolean; error?: string } = {
    ok: false,
    tables: false,
  };

  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      try {
        await prisma.user.count();
        database = { ok: true, tables: true };
      } catch {
        database = { ok: true, tables: false };
      }
    } catch (e) {
      database = { ok: false, tables: false, error: (e as Error).message.slice(0, 200) };
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
    missing.push("Tables absentes (le déploiement les crée automatiquement — redéploie)");

  return NextResponse.json(
    { ready, missing, env, database },
    { headers: { "Cache-Control": "no-store" } },
  );
}
