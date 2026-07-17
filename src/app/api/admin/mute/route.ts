import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Rendre muet / redonner la parole (chat) — admin.
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const muted = Boolean(body.muted);
  if (!userId)
    return NextResponse.json({ error: "userId manquant." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target)
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  if (target.isAdmin)
    return NextResponse.json({ error: "Impossible sur un admin." }, { status: 400 });

  await prisma.user.update({ where: { id: userId }, data: { muted } });
  return NextResponse.json({ ok: true, muted });
}
