import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Classements publics : territoire (pixels possédés), bâtisseurs (posés), niveaux.
export async function GET() {
  const [byOwned, byPlaced, byLevel] = await Promise.all([
    prisma.pixel.groupBy({
      by: ["ownerId"],
      where: { ownerId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
    prisma.user.findMany({
      where: { banned: false, totalPlaced: { gt: 0 } },
      orderBy: { totalPlaced: "desc" },
      take: 20,
      select: {
        pseudo: true, level: true, totalPlaced: true,
        equippedBadge: true, nameColor: true,
      },
    }),
    prisma.user.findMany({
      where: { banned: false, xp: { gt: 0 } },
      orderBy: { xp: "desc" },
      take: 20,
      select: {
        pseudo: true, level: true, xp: true,
        equippedBadge: true, nameColor: true,
      },
    }),
  ]);

  const ownerIds = byOwned.map((o) => o.ownerId).filter((v): v is string => !!v);
  const owners = await prisma.user.findMany({
    where: { id: { in: ownerIds }, banned: false },
    select: {
      id: true, pseudo: true, level: true,
      equippedBadge: true, nameColor: true,
    },
  });
  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  return NextResponse.json(
    {
      territory: byOwned
        .map((o) => {
          const u = o.ownerId ? ownerMap.get(o.ownerId) : null;
          if (!u) return null;
          return {
            pseudo: u.pseudo, level: u.level, badge: u.equippedBadge,
            color: u.nameColor, count: o._count._all,
          };
        })
        .filter(Boolean),
      builders: byPlaced.map((u) => ({
        pseudo: u.pseudo, level: u.level, badge: u.equippedBadge,
        color: u.nameColor, count: u.totalPlaced,
      })),
      levels: byLevel.map((u) => ({
        pseudo: u.pseudo, level: u.level, badge: u.equippedBadge,
        color: u.nameColor, count: u.xp,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
