import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cleanPseudo } from "@/lib/security";
import { rateLimit, tooMany } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  if (user.banned) return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`pseudo:${user.id}`, 5, 60_000)) return tooMany();

  const body = await req.json().catch(() => ({}));
  const pseudo = cleanPseudo(body.pseudo);

  if (!pseudo) {
    return NextResponse.json(
      { error: "Le pseudo doit faire entre 3 et 20 caractères (lettres, chiffres, - _)." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findFirst({
    where: { pseudo, NOT: { id: user.id } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Ce pseudo est déjà pris." }, { status: 409 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { pseudo } });
  return NextResponse.json({ ok: true, pseudo });
}
