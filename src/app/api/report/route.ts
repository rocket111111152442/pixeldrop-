import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInsideGrid } from "@/lib/canvas-config";
import { cleanText } from "@/lib/security";
import { rateLimit, tooMany } from "@/lib/rate-limit";

// Signaler un pixel (lien/message inapproprié) — traité par l'admin.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned) return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`report:${user.id}`, 5, 60_000)) return tooMany();

  const body = await req.json().catch(() => ({}));
  const x = Number(body.x);
  const y = Number(body.y);
  const reason = cleanText(body.reason, 300);
  if (!isInsideGrid(x, y))
    return NextResponse.json({ error: "Coordonnées invalides." }, { status: 400 });
  if (!reason)
    return NextResponse.json({ error: "Indique une raison." }, { status: 400 });

  await prisma.report.create({
    data: { x, y, reason, reporterId: user.id },
  });

  return NextResponse.json({ ok: true });
}
