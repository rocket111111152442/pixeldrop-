import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { FREE_PIXELS } from "@/lib/canvas-config";

// Inscription classique email + mot de passe.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");
  const rawPseudo = String(body.pseudo || "").trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Le mot de passe doit faire au moins 6 caractères." },
      { status: 400 },
    );
  }

  const pseudo =
    rawPseudo.replace(/[^a-zA-Z0-9_\- ]/g, "").slice(0, 20) ||
    `Pixel_${Math.random().toString(36).slice(2, 6)}`;
  if (pseudo.length < 3) {
    return NextResponse.json(
      { error: "Le pseudo doit faire au moins 3 caractères." },
      { status: 400 },
    );
  }

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

  const hashedPassword = await bcrypt.hash(password, 10);
  const isAdmin =
    !!process.env.ADMIN_EMAIL &&
    email === process.env.ADMIN_EMAIL.toLowerCase();

  await prisma.user.create({
    data: {
      email,
      hashedPassword,
      pseudo,
      name: pseudo,
      credits: FREE_PIXELS,
      isAdmin,
    },
  });

  return NextResponse.json({ ok: true });
}
