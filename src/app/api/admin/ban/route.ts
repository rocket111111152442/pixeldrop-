import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cleanText, intIn } from "@/lib/security";

// Bannit / débannit un compte. Les pixels et le compte sont conservés.
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const banned = Boolean(body.banned);
  const reason = cleanText(body.reason, 500) || "Sanction appliquee par un administrateur.";
  const durationDays = intIn(body.durationDays, 1, 3650);
  const permanent = body.permanent === true || (!durationDays && banned);
  if (!userId)
    return NextResponse.json({ error: "userId manquant." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target)
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  if (target.isAdmin)
    return NextResponse.json(
      { error: "Impossible de bannir un administrateur." },
      { status: 400 },
    );
  if (me?.id === target.id)
    return NextResponse.json(
      { error: "Impossible de bannir ton propre compte." },
      { status: 400 },
    );

  const now = new Date();
  const appealDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const banExpiresAt =
    banned && !permanent && durationDays
      ? new Date(now.getTime() + durationDays * 86_400_000)
      : null;

  await prisma.user.update({
    where: { id: userId },
    data: banned
      ? {
          banned: true,
          muted: true,
          bannedAt: now,
          banExpiresAt,
          banReason: reason,
          banCategory: permanent ? "ban_admin_definitif" : "ban_admin_temporaire",
          banSource: "admin",
          banSeverity: permanent ? "permanent_ban" : "temporary_ban",
          banAppealDeadline: appealDeadline,
          banAppealText: null,
          banAppealedAt: null,
          banAppealStatus: "none",
          banDeleteAfter: null,
        }
      : {
          banned: false,
          muted: false,
          bannedAt: null,
          banExpiresAt: null,
          banReason: null,
          banCategory: null,
          banSource: null,
          banSeverity: null,
          banAppealDeadline: null,
          banAppealText: null,
          banAppealedAt: null,
          banAppealStatus: "none",
          banDeleteAfter: null,
        },
  });

  return NextResponse.json({ ok: true, banned, permanent, banExpiresAt });
}
