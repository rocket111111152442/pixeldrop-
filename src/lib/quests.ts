// Logique de quêtes CÔTÉ SERVEUR (progression, réussite, distribution).
// Les définitions partagées avec le navigateur sont dans quest-types.ts.
import { prisma } from "@/lib/prisma";
import { type GoalType, inArea, parseItems } from "@/lib/quest-types";

export { GOAL_TYPES, parseItems, inArea } from "@/lib/quest-types";
export type { GoalType } from "@/lib/quest-types";

type BumpContext = {
  count?: number;
  color?: string;
  effect?: string | null;
  cells?: { x: number; y: number }[];
};

/**
 * Fait progresser les quêtes actives concernées par une action.
 * Best effort : ne doit JAMAIS faire échouer l'action du joueur.
 */
export async function bumpQuests(kind: GoalType | "place" | "bomb", ctx: BumpContext = {}) {
  try {
    const now = new Date();
    const quests = await prisma.quest.findMany({
      where: { status: "active", startAt: { lte: now }, endAt: { gt: now } },
    });
    if (quests.length === 0) return;

    for (const q of quests) {
      let inc = 0;
      const count = ctx.count ?? 1;

      if (q.goalType === "place" && kind === "place") {
        inc = count;
      } else if (q.goalType === "place_color" && kind === "place") {
        if (ctx.color && q.goalParam && ctx.color.toLowerCase() === q.goalParam.toLowerCase()) {
          inc = count;
        }
      } else if (q.goalType === "place_area" && kind === "place") {
        const cells = ctx.cells ?? [];
        inc = cells.filter((c) => inArea(q.goalParam, c.x, c.y)).length;
      } else if (q.goalType === "effect" && kind === "place") {
        if (ctx.effect && (!q.goalParam || q.goalParam === ctx.effect)) inc = count;
      } else if (q.goalType === "bomb" && kind === "bomb") {
        inc = count;
      }

      if (inc <= 0) continue;

      const updated = await prisma.quest.update({
        where: { id: q.id },
        data: { progress: { increment: inc } },
      });

      if (updated.progress >= updated.target && updated.status === "active") {
        await completeQuest(updated.id);
      }
    }
  } catch (e) {
    console.error("bumpQuests", e);
  }
}

/**
 * Marque une quête réussie et distribue la récompense à TOUS les joueurs
 * (non bannis). Idempotent : ne distribue qu'une seule fois.
 */
export async function completeQuest(questId: string): Promise<boolean> {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest || quest.distributedAt) return false;

  // Verrouille d'abord (évite une double distribution en cas de course).
  const locked = await prisma.quest.updateMany({
    where: { id: questId, distributedAt: null },
    data: { status: "success", distributedAt: new Date() },
  });
  if (locked.count === 0) return false;

  const users = await prisma.user.findMany({
    where: { banned: false },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return true;

  if (quest.rewardCredits > 0 || quest.rewardXp > 0) {
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: {
        ...(quest.rewardCredits > 0 ? { credits: { increment: quest.rewardCredits } } : {}),
        ...(quest.rewardXp > 0 ? { xp: { increment: quest.rewardXp } } : {}),
      },
    });
  }

  const items = parseItems(quest.rewardItems);
  for (const [sku, qty] of Object.entries(items)) {
    for (const uid of ids) {
      await prisma.inventoryItem.upsert({
        where: { userId_sku: { userId: uid, sku } },
        create: { userId: uid, sku, quantity: qty },
        update: { quantity: { increment: qty } },
      });
    }
  }

  return true;
}

/** Passe en "failed" les quêtes actives dont le délai est écoulé. */
export async function expireQuests() {
  try {
    await prisma.quest.updateMany({
      where: { status: "active", endAt: { lte: new Date() } },
      data: { status: "failed" },
    });
  } catch (e) {
    console.error("expireQuests", e);
  }
}
