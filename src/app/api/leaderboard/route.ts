import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Les comptes administrateurs sont exclus des classements : ils ont des
// cailloux illimités, leur présence fausserait le jeu.
// On exclut par le drapeau isAdmin ET par l'email d'admin (au cas où le
// drapeau n'aurait pas encore été posé en base).
function publicPlayers() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return {
    banned: false,
    isAdmin: false,
    ...(adminEmail ? { NOT: { email: adminEmail } } : {}),
  };
}

// Classements publics : territoire (cailloux possédés), bâtisseurs (posés), niveaux.
export async function GET() {
  const base = publicPlayers();

  const [byOwned, byPlaced, byLevel] = await Promise.all([
    // On prend large : certains propriétaires seront écartés ensuite (admins).
    prisma.pixel.groupBy({
      by: ["ownerId"],
      where: { ownerId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 60,
    }),
    prisma.user.findMany({
      where: { ...base, totalPlaced: { gt: 0 } },
      orderBy: { totalPlaced: "desc" },
      take: 20,
      select: {
        pseudo: true, level: true, totalPlaced: true,
        equippedBadge: true, nameColor: true,
      },
    }),
    prisma.user.findMany({
      where: { ...base, xp: { gt: 0 } },
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
    where: { ...base, id: { in: ownerIds } },
    select: {
      id: true, pseudo: true, level: true,
      equippedBadge: true, nameColor: true,
    },
  });
  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  const territory = byOwned
    .map((o) => {
      const u = o.ownerId ? ownerMap.get(o.ownerId) : null;
      if (!u) return null; // admin, banni ou compte supprimé
      return {
        pseudo: u.pseudo, level: u.level, badge: u.equippedBadge,
        color: u.nameColor, count: o._count._all,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, 20);

  return NextResponse.json(
    {
      territory,
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
