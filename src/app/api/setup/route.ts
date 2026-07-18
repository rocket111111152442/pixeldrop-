import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { rateLimit, ipOf, tooMany } from "@/lib/rate-limit";
import { redactError } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Crée / met à niveau le schéma (DDL 100% idempotent, aucune perte de données),
// puis crée le compte admin (uniquement si base vierge, ou si demandé par l'admin).
// Rejouable sans danger : sert aussi de migration après une mise à jour du code.

const SCHEMA_VERSION = "5";

const DDL: string[] = [
  // ── Tables de base (v1) ──
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL, "name" TEXT, "email" TEXT, "emailVerified" TIMESTAMP(3),
    "image" TEXT, "hashedPassword" TEXT, "pseudo" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false, "banned" BOOLEAN NOT NULL DEFAULT false,
    "credits" INTEGER NOT NULL DEFAULT 10, "freeGranted" BOOLEAN NOT NULL DEFAULT true,
    "totalPlaced" INTEGER NOT NULL DEFAULT 0, "totalSpentCts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER,
    "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL, "sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Pixel" (
    "id" TEXT NOT NULL, "x" INTEGER NOT NULL, "y" INTEGER NOT NULL, "color" TEXT NOT NULL,
    "link" TEXT, "text" TEXT, "shielded" BOOLEAN NOT NULL DEFAULT false, "golden" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Pixel_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "sku" TEXT NOT NULL, "label" TEXT NOT NULL,
    "amountCts" INTEGER NOT NULL, "creditsGranted" INTEGER NOT NULL DEFAULT 0, "itemsGranted" INTEGER NOT NULL DEFAULT 0,
    "stripeSessionId" TEXT, "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "sku" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id"))`,

  // ── v2 : colonnes User ──
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "muted" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xp" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "achievements" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailyStreak" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastDailyAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "equippedBadge" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "equippedTitle" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nameColor" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredById" TEXT`,
  // v4 : preuve d'acceptation des conditions générales
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3)`,
  // v5 : sanctions, contestations et modération automatique
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banExpiresAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banCategory" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banSource" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banSeverity" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banAppealDeadline" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banAppealText" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banAppealedAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banAppealStatus" TEXT NOT NULL DEFAULT 'none'`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banDeleteAfter" TIMESTAMP(3)`,

  // ── v2 : colonnes Pixel / Purchase ──
  `ALTER TABLE "Pixel" ADD COLUMN IF NOT EXISTS "effect" TEXT`,
  `ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "result" TEXT`,

  // ── v2 : nouvelles tables ──
  `CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "text" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3), "deletedReason" TEXT, "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id"))`,
  `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`,
  `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deletedReason" TEXT`,
  `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deletedById" TEXT`,
  `CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT NOT NULL, "x" INTEGER NOT NULL, "y" INTEGER NOT NULL, "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open', "reporterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Setting" (
    "key" TEXT NOT NULL, "value" TEXT NOT NULL,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key"))`,

  `CREATE TABLE IF NOT EXISTS "ModerationCase" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "userId" TEXT,
    "x" INTEGER,
    "y" INTEGER,
    "link" TEXT,
    "text" TEXT,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id"))`,

  // ── v3 : quêtes collectives ──
  `CREATE TABLE IF NOT EXISTS "Quest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "emoji" TEXT NOT NULL DEFAULT '🎯',
    "goalType" TEXT NOT NULL,
    "goalParam" TEXT,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3) NOT NULL,
    "rewardCredits" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "rewardItems" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "distributedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "Quest_status_idx" ON "Quest"("status")`,

  // ── Index ──
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_pseudo_key" ON "User"("pseudo")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")`,
  `CREATE INDEX IF NOT EXISTS "Pixel_updatedAt_idx" ON "Pixel"("updatedAt")`,
  `CREATE INDEX IF NOT EXISTS "Pixel_ownerId_idx" ON "Pixel"("ownerId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Pixel_x_y_key" ON "Pixel"("x", "y")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_stripeSessionId_key" ON "Purchase"("stripeSessionId")`,
  `CREATE INDEX IF NOT EXISTS "Purchase_createdAt_idx" ON "Purchase"("createdAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_userId_sku_key" ON "InventoryItem"("userId", "sku")`,
  `CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "ChatMessage_deletedAt_idx" ON "ChatMessage"("deletedAt")`,
  `CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status")`,
  `CREATE INDEX IF NOT EXISTS "ModerationCase_status_idx" ON "ModerationCase"("status")`,
  `CREATE INDEX IF NOT EXISTS "ModerationCase_userId_idx" ON "ModerationCase"("userId")`,
  `CREATE INDEX IF NOT EXISTS "ModerationCase_createdAt_idx" ON "ModerationCase"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "ModerationCase_targetType_targetId_idx" ON "ModerationCase"("targetType", "targetId")`,

  // ── Clés étrangères (ignorées si déjà présentes) ──
  `DO $$ BEGIN ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "Pixel" ADD CONSTRAINT "Pixel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function handle(req: Request) {
  if (!rateLimit(`setup:${ipOf(req)}`, 5, 60_000)) return tooMany();

  const url = new URL(req.url);
  const setupToken = process.env.SETUP_TOKEN;
  const suppliedToken = req.headers.get("x-setup-token") || url.searchParams.get("token");
  const caller = await getCurrentUser().catch(() => null);
  const authorized =
    isAdminUser(caller) ||
    (!!setupToken && suppliedToken === setupToken);

  if (!authorized) {
    return NextResponse.json(
      { error: "Setup verrouillé : connecte-toi en admin ou fournis SETUP_TOKEN." },
      { status: 403 },
    );
  }

  const errors: string[] = [];
  let applied = 0;
  for (const sql of DDL) {
    try {
      await prisma.$executeRawUnsafe(sql);
      applied++;
    } catch (e) {
      errors.push(redactError(e));
    }
  }

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Setting"("key","value") VALUES ('schema_version', $1)
       ON CONFLICT ("key") DO UPDATE SET "value" = $1`,
      SCHEMA_VERSION,
    );
  } catch (e) {
    errors.push(redactError(e));
  }

  // Compte administrateur : base vierge → création automatique ;
  // sinon uniquement si l'appelant est déjà admin (remise à jour du mot de passe).
  let admin = "inchangé";
  try {
    if (authorized) {
      const email = (process.env.ADMIN_EMAIL || "admin@pixeldrop.app").toLowerCase();
      const password = process.env.ADMIN_PASSWORD;
      const pseudoBase = process.env.ADMIN_PSEUDO || "Admin";
      if (!password || password.length < 12) {
        admin = "ignoré: ADMIN_PASSWORD manquant ou trop court";
        return NextResponse.json({
          ok: errors.length === 0,
          schemaVersion: SCHEMA_VERSION,
          applied,
          total: DDL.length,
          admin,
          errors,
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.user.update({
          where: { email },
          data: {
            hashedPassword,
            isAdmin: true,
            emailVerified: new Date(),
            banned: false,
          },
        });
        admin = "mis à jour";
      } else {
        let pseudo = pseudoBase;
        if (await prisma.user.findFirst({ where: { pseudo } })) {
          pseudo = `${pseudoBase}_${Math.random().toString(36).slice(2, 6)}`;
        }
        await prisma.user.create({
          data: {
            email, hashedPassword, pseudo, name: pseudo,
            emailVerified: new Date(), isAdmin: true, credits: 1_000_000, freeGranted: false,
          },
        });
        admin = "créé";
      }
    }
  } catch (e) {
    admin = "erreur: " + redactError(e);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    schemaVersion: SCHEMA_VERSION,
    applied,
    total: DDL.length,
    admin,
    errors,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
