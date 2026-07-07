import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInsideGrid } from "@/lib/canvas-config";

class BombError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const x = Number(body.x);
  const y = Number(body.y);
  const mega = Boolean(body.mega);
  if (!isInsideGrid(x, y))
    return NextResponse.json({ error: "Hors de la grille." }, { status: 400 });

  const sku = mega ? "mega_bomb" : "bomb";

  try {
    const removed = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new BombError(401, "Non connecté.");
      const admin = isAdminUser(dbUser);

      // Zone visée.
      const coords: { x: number; y: number }[] = [];
      if (mega) {
        for (let dx = -1; dx <= 1; dx++)
          for (let dy = -1; dy <= 1; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (isInsideGrid(nx, ny)) coords.push({ x: nx, y: ny });
          }
      } else {
        coords.push({ x, y });
      }

      const targets = await tx.pixel.findMany({
        where: { OR: coords.map((c) => ({ x: c.x, y: c.y })) },
      });

      // Cibles détruisables : pixels d'autrui, non protégés (admin ignore ces règles).
      const destroyable = targets.filter((p) =>
        admin ? true : p.ownerId !== dbUser.id && !p.shielded,
      );

      if (destroyable.length === 0) {
        throw new BombError(400, "Rien à détruire ici (vide, protégé, ou à toi).");
      }

      // Consomme l'item (hors admin).
      if (!admin) {
        const item = await tx.inventoryItem.findUnique({
          where: { userId_sku: { userId: dbUser.id, sku } },
        });
        if (!item || item.quantity < 1)
          throw new BombError(
            402,
            mega ? "Aucune méga-bombe en stock." : "Aucune bombe en stock.",
          );
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: 1 } },
        });
      }

      await tx.pixel.deleteMany({
        where: { id: { in: destroyable.map((p) => p.id) } },
      });

      return destroyable.map((p) => ({ x: p.x, y: p.y }));
    });

    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    if (e instanceof BombError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("bomb error", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
