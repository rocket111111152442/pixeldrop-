import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { xpForLevel } from "@/lib/achievements";

export const dynamic = "force-dynamic";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// État complet du joueur connecté.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false });

  // Présence (compteur "en ligne") — mise à jour au plus 1×/min.
  if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > 60_000) {
    prisma.user
      .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
  }

  // Code parrain généré paresseusement.
  let referralCode = user.referralCode;
  if (!referralCode) {
    referralCode = ("PD" + user.id.slice(-6)).toUpperCase();
    try {
      await prisma.user.update({ where: { id: user.id }, data: { referralCode } });
    } catch {
      referralCode = user.referralCode ?? null;
    }
  }

  const [items, ownedPixels] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { userId: user.id } }),
    prisma.pixel.count({ where: { ownerId: user.id } }),
  ]);

  const inventory: Record<string, number> = {};
  const unlocks: string[] = [];
  for (const i of items) {
    if (
      i.sku.startsWith("badge_") ||
      i.sku.startsWith("title_") ||
      i.sku.startsWith("name_")
    ) {
      if (i.quantity > 0) unlocks.push(i.sku);
    } else {
      inventory[i.sku] = i.quantity;
    }
  }

  const dailyClaimable =
    !user.lastDailyAt || dayKey(user.lastDailyAt) !== dayKey(new Date());

  return NextResponse.json(
    {
      authenticated: true,
      id: user.id,
      pseudo: user.pseudo,
      email: user.email,
      image: user.image,
      isAdmin: isAdminUser(user),
      banned: user.banned,
      muted: user.muted,
      bannedAt: user.bannedAt,
      banExpiresAt: user.banExpiresAt,
      banReason: user.banReason,
      banCategory: user.banCategory,
      banSeverity: user.banSeverity,
      banAppealDeadline: user.banAppealDeadline,
      banAppealStatus: user.banAppealStatus,
      banDeleteAfter: user.banDeleteAfter,
      credits: user.credits,
      totalPlaced: user.totalPlaced,
      ownedPixels,
      xp: user.xp,
      level: user.level,
      xpNext: xpForLevel(user.level + 1),
      xpBase: xpForLevel(user.level),
      achievements: user.achievements.split(",").filter(Boolean),
      equippedBadge: user.equippedBadge,
      equippedTitle: user.equippedTitle,
      nameColor: user.nameColor,
      referralCode,
      referredBy: !!user.referredById,
      dailyStreak: user.dailyStreak,
      dailyClaimable,
      hasPassword: !!user.hashedPassword,
      memberSince: user.createdAt,
      inventory,
      unlocks,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
