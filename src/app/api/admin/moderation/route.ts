import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/security";
import { runModerationMaintenance } from "@/lib/moderation";

export const dynamic = "force-dynamic";

function clearBanData() {
  return {
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
    banAppealStatus: "accepted",
    banDeleteAfter: null,
  };
}

async function requireAdmin() {
  const me = await getCurrentUser();
  return isAdminUser(me) ? me : null;
}

export async function GET() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  await runModerationMaintenance();

  const [cases, appeals] = await Promise.all([
    prisma.moderationCase.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            pseudo: true,
            email: true,
            banned: true,
            banReason: true,
            banExpiresAt: true,
            banAppealDeadline: true,
            banAppealStatus: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { banned: true, banAppealStatus: "pending" },
      orderBy: { banAppealedAt: "desc" },
      take: 50,
      select: {
        id: true,
        pseudo: true,
        email: true,
        banReason: true,
        banCategory: true,
        banSeverity: true,
        banSource: true,
        bannedAt: true,
        banExpiresAt: true,
        banAppealDeadline: true,
        banAppealText: true,
        banAppealedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    cases: cases.map((c) => ({
      id: c.id,
      source: c.source,
      targetType: c.targetType,
      targetId: c.targetId,
      status: c.status,
      user: c.user,
      x: c.x,
      y: c.y,
      link: c.link,
      text: c.text,
      category: c.category,
      severity: c.severity,
      action: c.action,
      reason: c.reason,
      details: c.details,
      createdAt: c.createdAt,
    })),
    appeals,
  });
}

export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const id = String(body.id || "");
  const userId = String(body.userId || "");
  const note = cleanText(body.note, 600);

  const resolveCase = async (caseId: string, adminNote?: string | null) => {
    await prisma.moderationCase.update({
      where: { id: caseId },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
        resolvedById: me.id,
        adminNote: adminNote || null,
      },
    });
  };

  const caseRow = id
    ? await prisma.moderationCase.findUnique({ where: { id } })
    : null;

  if (id && !caseRow) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  }

  if (action === "resolve") {
    if (!id) return NextResponse.json({ error: "id manquant." }, { status: 400 });
    await resolveCase(id, note);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_pixel") {
    const x = Number(body.x ?? caseRow?.x);
    const y = Number(body.y ?? caseRow?.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return NextResponse.json({ error: "Coordonnées manquantes." }, { status: 400 });
    }
    await prisma.pixel.deleteMany({ where: { x, y } });
    if (id) await resolveCase(id, note || "Pixel supprime.");
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_chat") {
    const targetId = String(body.targetId || caseRow?.targetId || "");
    if (!targetId) return NextResponse.json({ error: "Message introuvable." }, { status: 400 });
    await prisma.chatMessage.updateMany({
      where: { id: targetId },
      data: {
        deletedAt: new Date(),
        deletedReason: note || "Supprime par un administrateur.",
        deletedById: me.id,
      },
    });
    if (id) await resolveCase(id, note || "Message supprime.");
    return NextResponse.json({ ok: true });
  }

  const targetUserId = userId || caseRow?.userId || "";
  if (!targetUserId) {
    return NextResponse.json({ error: "userId manquant." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  if (target.isAdmin) {
    return NextResponse.json({ error: "Impossible de sanctionner un administrateur." }, { status: 400 });
  }

  if (action === "accept_appeal" || action === "unban_user") {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: target.id }, data: clearBanData() });
      await tx.moderationCase.updateMany({
        where: { userId: target.id, status: "open" },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          resolvedById: me.id,
          adminNote: note || "Contestation acceptee, compte debanni.",
        },
      });
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "confirm_permanent") {
    await prisma.user.update({
      where: { id: target.id },
      data: {
        banned: true,
        muted: true,
        banSeverity: "permanent_ban",
        banCategory: target.banCategory || "ban_admin_definitif",
        banReason: note || target.banReason || "Sanction definitive confirmee par un administrateur.",
        banSource: "admin",
        banExpiresAt: null,
        banAppealStatus: "rejected",
        banDeleteAfter: null,
      },
    });
    if (id) await resolveCase(id, note || "Ban definitif confirme.");
    return NextResponse.json({ ok: true });
  }

  if (action === "reject_appeal_delete") {
    await prisma.$transaction(async (tx) => {
      await tx.moderationCase.updateMany({
        where: { userId: target.id, status: "open" },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          resolvedById: me.id,
          adminNote: note || "Contestation rejetee, compte supprime.",
        },
      });
      await tx.moderationCase.create({
        data: {
          source: "admin",
          targetType: "user",
          targetId: target.id,
          userId: target.id,
          status: "resolved",
          category: target.banCategory || "ban_definitif",
          severity: "permanent_ban",
          action: "account_deleted",
          reason: note || "Compte supprime apres rejet de contestation.",
          details: target.banReason || null,
          resolvedAt: new Date(),
          resolvedById: me.id,
        },
      });
      await tx.user.delete({ where: { id: target.id } });
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
