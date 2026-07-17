import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit, tooMany } from "@/lib/rate-limit";

// Suppression de compte par le joueur lui-même.
// Ses pixels restent sur la carte (anonymes) ; achats/inventaire supprimés.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (!rateLimit(`del:${user.id}`, 3, 60_000)) return tooMany();

  if (user.isAdmin)
    return NextResponse.json(
      { error: "Le compte administrateur ne peut pas se supprimer ici." },
      { status: 400 },
    );

  const body = await req.json().catch(() => ({}));
  if (String(body.confirm || "") !== "SUPPRIMER")
    return NextResponse.json(
      { error: 'Écris "SUPPRIMER" pour confirmer.' },
      { status: 400 },
    );

  await prisma.user.delete({ where: { id: user.id } });
  return NextResponse.json({ ok: true });
}
