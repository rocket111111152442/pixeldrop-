import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireQuests } from "@/lib/quests";

export const dynamic = "force-dynamic";

// Liste publique des quêtes collectives (tout le monde peut les voir).
export async function GET() {
  try {
    await expireQuests();

    const [active, recent] = await Promise.all([
      prisma.quest.findMany({
        where: { status: "active" },
        orderBy: { endAt: "asc" },
        take: 20,
      }),
      prisma.quest.findMany({
        where: { status: { in: ["success", "failed"] } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    const shape = (q: (typeof active)[number]) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      emoji: q.emoji,
      goalType: q.goalType,
      goalParam: q.goalParam,
      target: q.target,
      progress: Math.min(q.progress, q.target),
      rawProgress: q.progress,
      pct: q.target > 0 ? Math.min(100, (q.progress / q.target) * 100) : 0,
      endAt: q.endAt,
      status: q.status,
      rewardCredits: q.rewardCredits,
      rewardXp: q.rewardXp,
      rewardItems: q.rewardItems,
    });

    return NextResponse.json(
      { active: active.map(shape), recent: recent.map(shape) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Table pas encore créée (schéma à mettre à niveau via /api/setup)
    return NextResponse.json({ active: [], recent: [] });
  }
}
