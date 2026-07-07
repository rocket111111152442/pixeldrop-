import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = String(body.pseudo || "").trim();
  const pseudo = raw.replace(/[^a-zA-Z0-9_\- ]/g, "").slice(0, 20);

  if (pseudo.length < 3) {
    return NextResponse.json(
      { error: "Le pseudo doit faire au moins 3 caractères." },
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
