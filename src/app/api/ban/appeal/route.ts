import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/security";
import { rateLimit, tooMany } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (!user.banned) return NextResponse.json({ error: "Ton compte n'est pas banni." }, { status: 400 });
  if (!rateLimit(`appeal:${user.id}`, 3, 60_000)) return tooMany();

  const now = new Date();
  if (user.banAppealDeadline && user.banAppealDeadline < now) {
    return NextResponse.json(
      { error: "Le délai de contestation de 24h est dépassé." },
      { status: 400 },
    );
  }
  if (user.banAppealStatus === "pending") {
    return NextResponse.json({ error: "Ta contestation est déjà en attente." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const text = cleanText(body.text, 1200);
  if (!text || text.length < 20) {
    return NextResponse.json(
      { error: "Explique ta contestation en au moins 20 caractères." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        banAppealText: text,
        banAppealedAt: now,
        banAppealStatus: "pending",
      },
    });
    await tx.moderationCase.create({
      data: {
        source: "appeal",
        targetType: "appeal",
        targetId: user.id,
        userId: user.id,
        category: user.banCategory || "contestation",
        severity: user.banSeverity || "review",
        action: "reported",
        reason: "Contestation utilisateur a examiner.",
        details: text,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
