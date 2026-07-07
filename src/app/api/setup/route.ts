import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Crée les tables (via la connexion runtime qui fonctionne) puis le compte admin.
// Sécurité : ne s'exécute que si la base ne contient encore aucun compte.

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "hashedPassword" TEXT,
    "pseudo" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "credits" INTEGER NOT NULL DEFAULT 10,
    "freeGranted" BOOLEAN NOT NULL DEFAULT true,
    "totalPlaced" INTEGER NOT NULL DEFAULT 0,
    "totalSpentCts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "Pixel" (
    "id" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "link" TEXT,
    "text" TEXT,
    "shielded" BOOLEAN NOT NULL DEFAULT false,
    "golden" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Pixel_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountCts" INTEGER NOT NULL,
    "creditsGranted" INTEGER NOT NULL DEFAULT 0,
    "itemsGranted" INTEGER NOT NULL DEFAULT 0,
    "stripeSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_pseudo_key" ON "User"("pseudo")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")`,
  `CREATE INDEX IF NOT EXISTS "Pixel_updatedAt_idx" ON "Pixel"("updatedAt")`,
  `CREATE INDEX IF NOT EXISTS "Pixel_ownerId_idx" ON "Pixel"("ownerId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Pixel_x_y_key" ON "Pixel"("x", "y")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_stripeSessionId_key" ON "Purchase"("stripeSessionId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_userId_sku_key" ON "InventoryItem"("userId", "sku")`,
  `ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "Pixel" ADD CONSTRAINT "Pixel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
];

async function handle() {
  // Refuse si des comptes existent déjà (protège une base en production).
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      return NextResponse.json(
        { ok: false, error: "Déjà initialisé (des comptes existent).", users: count },
        { status: 403 },
      );
    }
  } catch {
    // La table n'existe pas encore : on continue, c'est le but.
  }

  const errors: string[] = [];
  let applied = 0;
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      applied++;
    } catch (e) {
      // Les contraintes déjà présentes (ré-exécution) sont ignorées.
      errors.push((e as Error).message.slice(0, 120));
    }
  }

  // Compte administrateur
  let admin = "non créé";
  try {
    const email = (process.env.ADMIN_EMAIL || "admin@pixeldrop.app").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "changeme123";
    const pseudoBase = process.env.ADMIN_PSEUDO || "Admin";
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { hashedPassword, isAdmin: true, banned: false },
      });
      admin = `mis à jour (${email})`;
    } else {
      let pseudo = pseudoBase;
      if (await prisma.user.findFirst({ where: { pseudo } })) {
        pseudo = `${pseudoBase}_${Math.random().toString(36).slice(2, 6)}`;
      }
      await prisma.user.create({
        data: {
          email,
          hashedPassword,
          pseudo,
          name: pseudo,
          isAdmin: true,
          credits: 1_000_000,
          freeGranted: false,
        },
      });
      admin = `créé (${email})`;
    }
  } catch (e) {
    admin = "erreur: " + (e as Error).message.slice(0, 120);
  }

  return NextResponse.json({ ok: true, applied, total: STATEMENTS.length, admin, errors });
}

export async function GET() {
  return handle();
}

export async function POST() {
  return handle();
}
