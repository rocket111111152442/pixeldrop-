import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Carte de visite publique d'un joueur (aucune donnée privée).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pseudo = String(searchParams.get("pseudo") || "").slice(0, 30);
  if (!pseudo) return NextResponse.json({ error: "pseudo manquant" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { pseudo, banned: false },
    select: {
      id: true,
      pseudo: true,
      level: true,
      xp: true,
      bio: true,
      totalPlaced: true,
      achievements: true,
      equippedBadge: true,
      equippedTitle: true,
      nameColor: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ found: false });

  const owned = await prisma.pixel.count({ where: { ownerId: user.id } });

  return NextResponse.json({
    found: true,
    pseudo: user.pseudo,
    level: user.level,
    xp: user.xp,
    bio: user.bio,
    totalPlaced: user.totalPlaced,
    owned,
    badge: user.equippedBadge,
    title: user.equippedTitle,
    color: user.nameColor,
    achievements: user.achievements.split(",").filter(Boolean),
    memberSince: user.createdAt,
  });
}
