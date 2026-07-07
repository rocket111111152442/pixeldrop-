import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Détail d'un pixel (au clic) : couleur, lien, texte, propriétaire.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const x = Number(searchParams.get("x"));
  const y = Number(searchParams.get("y"));
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    return NextResponse.json({ error: "coordonnées invalides" }, { status: 400 });
  }

  const pixel = await prisma.pixel.findUnique({
    where: { x_y: { x, y } },
    include: { owner: { select: { pseudo: true } } },
  });

  if (!pixel) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
    link: pixel.link,
    text: pixel.text,
    golden: pixel.golden,
    shielded: pixel.shielded,
    owner: pixel.owner?.pseudo || "?",
    createdAt: pixel.createdAt,
  });
}
