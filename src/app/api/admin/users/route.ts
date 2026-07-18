import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { runModerationMaintenance } from "@/lib/moderation";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  await runModerationMaintenance();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      pseudo: true,
      email: true,
      image: true,
      credits: true,
      banned: true,
      muted: true,
      bannedAt: true,
      banExpiresAt: true,
      banReason: true,
      banCategory: true,
      banSource: true,
      banSeverity: true,
      banAppealDeadline: true,
      banAppealText: true,
      banAppealedAt: true,
      banAppealStatus: true,
      banDeleteAfter: true,
      isAdmin: true,
      level: true,
      totalPlaced: true,
      totalSpentCts: true,
      createdAt: true,
      _count: { select: { pixels: true } },
    },
  });

  return NextResponse.json({ users });
}
