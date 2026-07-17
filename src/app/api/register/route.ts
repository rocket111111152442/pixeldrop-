import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { FREE_PIXELS } from "@/lib/canvas-config";
import { cleanEmail, cleanPseudo } from "@/lib/security";
import { rateLimit, ipOf, tooMany } from "@/lib/rate-limit";

const REFERRAL_BONUS = 5;

// Inscription email + mot de passe (avec code parrain optionnel).
export async function POST(req: Request) {
  if (!rateLimit(`register:${ipOf(req)}`, 5, 10 * 60_000)) return tooMany();

  const body = await req.json().catch(() => ({}));

  // Honeypot anti-bot : champ invisible — un humain ne le remplit jamais.
  if (String(body.website || "").length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = cleanEmail(body.email);
  const password = String(body.password || "");
  const refCode = String(body.referral || "").trim().toUpperCase().slice(0, 20);

  if (!email) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Le mot de passe doit faire au moins 6 caractères." },
      { status: 400 },
    );
  }

  const pseudo =
    cleanPseudo(body.pseudo) || `Pixel_${Math.random().toString(36).slice(2, 6)}`;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email." },
      { status: 409 },
    );
  }
  const existingPseudo = await prisma.user.findFirst({ where: { pseudo } });
  if (existingPseudo) {
    return NextResponse.json({ error: "Ce pseudo est déjà pris." }, { status: 409 });
  }

  // Parrainage optionnel.
  let referrer: { id: string } | null = null;
  if (refCode) {
    referrer = await prisma.user.findFirst({
      where: { referralCode: refCode, banned: false },
      select: { id: true },
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const isAdmin =
    !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase();

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        email,
        hashedPassword,
        pseudo,
        name: pseudo,
        credits: FREE_PIXELS + (referrer ? REFERRAL_BONUS : 0),
        isAdmin,
        referredById: referrer?.id ?? null,
      },
    });
    if (referrer) {
      await tx.user.update({
        where: { id: referrer.id },
        data: { credits: { increment: REFERRAL_BONUS } },
      });
    }
  });

  return NextResponse.json({ ok: true, referralApplied: !!referrer });
}
