import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Bannit / débannit un compte. Bannir supprime TOUS ses pixels.
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const banned = Boolean(body.banned);
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

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { banned } });
    if (banned) {
      // Le bannissement efface tous les pixels posés par ce compte.
      await tx.pixel.deleteMany({ where: { ownerId: userId } });
    }
  });

  return NextResponse.json({ ok: true, banned });
}
