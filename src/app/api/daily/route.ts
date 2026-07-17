import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { awardAchievements } from "@/lib/game";

export const dynamic = "force-dynamic";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function status(lastDailyAt: Date | null, streak: number) {
  const today = dayKey(new Date());
  const last = lastDailyAt ? dayKey(lastDailyAt) : null;
  const claimable = last !== today;
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const nextStreak = last === yesterday ? streak + 1 : 1;
  const reward = Math.min(1 + nextStreak, 7);
  return { claimable, streak, nextStreak, reward };
}

// Récompense quotidienne : 2 à 7 pixels gratuits par jour selon la série.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ claimable: false, streak: 0, reward: 0 });
  const s = status(user.lastDailyAt, user.dailyStreak);
  return NextResponse.json(s, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`daily:${user.id}`, 5, 60_000)) return tooMany();

  const s = status(user.lastDailyAt, user.dailyStreak);
  if (!s.claimable)
    return NextResponse.json(
      { error: "Déjà réclamé aujourd'hui — reviens demain !" },
      { status: 400 },
    );

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      credits: { increment: s.reward },
      dailyStreak: s.nextStreak,
      lastDailyAt: new Date(),
    },
    select: { credits: true, dailyStreak: true },
  });

  let newAchievements: string[] = [];
  try {
    const cand: string[] = [];
    if (updated.dailyStreak >= 3) cand.push("streak_3");
    if (updated.dailyStreak >= 7) cand.push("streak_7");
    newAchievements = await awardAchievements(user.id, cand);
  } catch {
    /* best effort */
  }

  return NextResponse.json({
    ok: true,
    reward: s.reward,
    credits: updated.credits,
    streak: updated.dailyStreak,
    newAchievements,
  });
}
