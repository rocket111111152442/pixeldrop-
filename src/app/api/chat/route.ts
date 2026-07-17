import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/security";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { addXp, awardAchievements, XP_CHAT } from "@/lib/game";

export const dynamic = "force-dynamic";

// Chat global — lecture publique, écriture pour les joueurs connectés.
export async function GET() {
  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: {
          pseudo: true,
          level: true,
          isAdmin: true,
          equippedBadge: true,
          nameColor: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      messages: messages.reverse().map((m) => ({
        id: m.id,
        text: m.text,
        at: m.createdAt,
        pseudo: m.user.pseudo,
        level: m.user.level,
        admin: m.user.isAdmin,
        badge: m.user.equippedBadge,
        color: m.user.nameColor,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (user.muted)
    return NextResponse.json({ error: "Tu as été rendu muet par un modérateur." }, { status: 403 });
  if (!rateLimit(`chat:${user.id}`, 1, 2_000) || !rateLimit(`chatm:${user.id}`, 20, 60_000))
    return tooMany();

  const body = await req.json().catch(() => ({}));
  const text = cleanText(body.text, 200);
  if (!text) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  const msg = await prisma.chatMessage.create({
    data: { userId: user.id, text },
  });

  let newAchievements: string[] = [];
  try {
    await addXp(user.id, XP_CHAT);
    newAchievements = await awardAchievements(user.id, ["first_chat"]);
  } catch {
    /* best effort */
  }

  return NextResponse.json({ ok: true, id: msg.id, newAchievements });
}

// Suppression : l'auteur ou un admin.
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id manquant." }, { status: 400 });

  const msg = await prisma.chatMessage.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ ok: true });
  if (msg.userId !== user.id && !isAdminUser(user))
    return NextResponse.json({ error: "Interdit." }, { status: 403 });

  await prisma.chatMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
