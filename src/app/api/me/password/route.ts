import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit, ipOf, tooMany } from "@/lib/rate-limit";

// Changement de mot de passe (comptes email uniquement).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (!rateLimit(`pwd:${user.id}:${ipOf(req)}`, 5, 15 * 60_000)) return tooMany();

  if (!user.hashedPassword)
    return NextResponse.json(
      { error: "Ce compte utilise Google/Microsoft/Apple — pas de mot de passe à changer." },
      { status: 400 },
    );

  const body = await req.json().catch(() => ({}));
  const oldPassword = String(body.oldPassword || "");
  const newPassword = String(body.newPassword || "");

  if (newPassword.length < 8)
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit faire au moins 8 caractères." },
      { status: 400 },
    );

  const ok = await bcrypt.compare(oldPassword, user.hashedPassword);
  if (!ok)
    return NextResponse.json({ error: "Ancien mot de passe incorrect." }, { status: 403 });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { hashedPassword } });

  return NextResponse.json({ ok: true });
}
