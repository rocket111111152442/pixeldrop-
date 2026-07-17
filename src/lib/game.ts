// Helpers de progression CÔTÉ SERVEUR (XP, niveaux, succès).
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, levelFromXp } from "@/lib/achievements";

export {
  ACHIEVEMENTS,
  levelFromXp,
  xpForLevel,
  levelAchievements,
  XP_PLACE,
  XP_BOMB,
  XP_CHAT,
} from "@/lib/achievements";

/**
 * Ajoute les succès manquants au joueur, retourne UNIQUEMENT les nouveaux.
 * (achievements = ids séparés par des virgules sur User)
 */
export async function awardAchievements(
  userId: string,
  candidates: string[],
): Promise<string[]> {
  const valid = candidates.filter((c) => ACHIEVEMENTS[c]);
  if (valid.length === 0) return [];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { achievements: true },
  });
  if (!user) return [];
  const owned = new Set(user.achievements.split(",").filter(Boolean));
  const fresh = valid.filter((c) => !owned.has(c));
  if (fresh.length === 0) return [];
  for (const f of fresh) owned.add(f);
  await prisma.user.update({
    where: { id: userId },
    data: { achievements: Array.from(owned).join(",") },
  });
  return fresh;
}

/** Ajoute de l'XP, met à jour le niveau. Retourne le nouvel état. */
export async function addXp(userId: string, amount: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true },
  });
  if (!user) return { xp: 0, level: 1, leveledUp: false };
  const xp = user.xp + amount;
  const level = levelFromXp(xp);
  await prisma.user.update({ where: { id: userId }, data: { xp, level } });
  return { xp, level, leveledUp: level > user.level };
}
