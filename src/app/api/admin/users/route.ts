import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { runModerationMaintenance } from "@/lib/moderation";

export const dynamic = "force-dynamic";

function isConfiguredAdminEmail(email: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return !!adminEmail && email?.toLowerCase() === adminEmail;
}

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

export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const isAdmin = body.isAdmin === true;
  if (!userId)
    return NextResponse.json({ error: "userId manquant." }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, pseudo: true, email: true, isAdmin: true },
  });
  if (!target)
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  if (target.id === me?.id)
    return NextResponse.json(
      { error: "Impossible de modifier ton propre rôle admin." },
      { status: 400 },
    );
  if (!isAdmin && isConfiguredAdminEmail(target.email))
    return NextResponse.json(
      { error: "Impossible de retirer le rôle admin au compte admin principal." },
      { status: 400 },
    );

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isAdmin },
    select: { id: true, pseudo: true, email: true, isAdmin: true },
  });

  return NextResponse.json({ ok: true, user });
}

export async function DELETE(req: Request) {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  if (!userId)
    return NextResponse.json({ error: "userId manquant." }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, pseudo: true, email: true, isAdmin: true },
  });
  if (!target)
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  if (target.id === me?.id)
    return NextResponse.json(
      { error: "Impossible de supprimer ton propre compte depuis le panneau admin." },
      { status: 400 },
    );
  if (isConfiguredAdminEmail(target.email))
    return NextResponse.json(
      { error: "Impossible de supprimer le compte admin principal." },
      { status: 400 },
    );
  if (target.isAdmin)
    return NextResponse.json(
      { error: "Retire d'abord le rôle admin de ce compte avant de le supprimer." },
      { status: 400 },
    );

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true, deletedUserId: userId });
}
