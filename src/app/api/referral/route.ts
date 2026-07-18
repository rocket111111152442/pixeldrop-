import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit, tooMany } from "@/lib/rate-limit";

const REFERRAL_BONUS = 5;

// Appliquer un code parrain (une seule fois) : +5 pixels pour toi ET le parrain.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned) return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`ref:${user.id}`, 5, 60_000)) return tooMany();

  if (user.referredById)
    return NextResponse.json({ error: "Tu as déjà utilisé un code parrain." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase().slice(0, 20);
  if (!code) return NextResponse.json({ error: "Code manquant." }, { status: 400 });

  const referrer = await prisma.user.findFirst({
    where: { referralCode: code, banned: false },
    select: { id: true, pseudo: true },
  });
  if (!referrer)
    return NextResponse.json({ error: "Code parrain introuvable." }, { status: 404 });
  if (referrer.id === user.id)
    return NextResponse.json({ error: "Tu ne peux pas te parrainer toi-même 😄" }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { referredById: referrer.id, credits: { increment: REFERRAL_BONUS } },
    }),
    prisma.user.update({
      where: { id: referrer.id },
      data: { credits: { increment: REFERRAL_BONUS } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    bonus: REFERRAL_BONUS,
    referrer: referrer.pseudo,
  });
}
