import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/security";
import { completeQuest, GOAL_TYPES, parseItems } from "@/lib/quests";
import { ITEM_LABELS } from "@/lib/products";

export const dynamic = "force-dynamic";

const VALID_GOALS = new Set(GOAL_TYPES.map((g) => g.id as string));

async function requireAdmin() {
  const me = await getCurrentUser();
  return isAdminUser(me) ? me : null;
}

// Valide "bomb:2,shield:1" et ne garde que des items connus.
function cleanRewardItems(spec: unknown): string {
  const parsed = parseItems(String(spec || ""));
  const ok = Object.entries(parsed).filter(([sku]) => !!ITEM_LABELS[sku]);
  return ok.map(([sku, qty]) => `${sku}:${Math.min(qty, 999)}`).join(",");
}

function parseBody(body: Record<string, unknown>) {
  const title = cleanText(body.title, 80);
  const description = cleanText(body.description, 300) ?? "";
  const emoji = cleanText(body.emoji, 4) ?? "🎯";
  const goalType = String(body.goalType || "");
  const goalParamRaw = cleanText(body.goalParam, 60);
  const target = Math.max(1, Math.min(1_000_000, Math.trunc(Number(body.target) || 0)));
  const rewardCredits = Math.max(0, Math.min(100_000, Math.trunc(Number(body.rewardCredits) || 0)));
  const rewardXp = Math.max(0, Math.min(100_000, Math.trunc(Number(body.rewardXp) || 0)));
  const rewardItems = cleanRewardItems(body.rewardItems);

  if (!title) return { error: "Titre obligatoire." as const };
  if (!VALID_GOALS.has(goalType)) return { error: "Type d'objectif inconnu." as const };
  if (!Number.isFinite(target) || target < 1) return { error: "Objectif invalide." as const };

  // Durée : soit une date de fin, soit un nombre d'heures.
  let endAt: Date;
  if (body.endAt) {
    endAt = new Date(String(body.endAt));
  } else {
    const hours = Math.max(1, Math.min(24 * 365, Number(body.durationHours) || 24));
    endAt = new Date(Date.now() + hours * 3600_000);
  }
  if (isNaN(endAt.getTime())) return { error: "Date de fin invalide." as const };

  return {
    data: {
      title, description, emoji, goalType,
      goalParam: goalParamRaw, target, endAt,
      rewardCredits, rewardXp, rewardItems,
    },
  };
}

// Liste complète (admin)
export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const quests = await prisma.quest.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ quests, goalTypes: GOAL_TYPES });
}

// Création
export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const quest = await prisma.quest.create({ data: parsed.data });
  return NextResponse.json({ ok: true, quest });
}

// Modification (tous les champs, + statut/progression pour un contrôle total)
export async function PATCH(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id manquant." }, { status: 400 });

  const existing = await prisma.quest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Quête introuvable." }, { status: 404 });

  // Action rapide : forcer la réussite (distribue les récompenses).
  if (body.action === "complete") {
    const done = await completeQuest(id);
    return NextResponse.json({ ok: done, alreadyDistributed: !done });
  }
  if (body.action === "cancel") {
    await prisma.quest.update({ where: { id }, data: { status: "failed" } });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "reset") {
    await prisma.quest.update({
      where: { id },
      data: { progress: 0, status: "active", distributedAt: null },
    });
    return NextResponse.json({ ok: true });
  }

  const parsed = parseBody({ ...existing, ...body });
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const extra: { progress?: number } = {};
  if (body.progress !== undefined) {
    extra.progress = Math.max(0, Math.trunc(Number(body.progress) || 0));
  }

  const quest = await prisma.quest.update({
    where: { id },
    data: { ...parsed.data, ...extra },
  });
  return NextResponse.json({ ok: true, quest });
}

// Suppression
export async function DELETE(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id manquant." }, { status: 400 });

  await prisma.quest.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
