import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInsideGrid, isValidHexColor } from "@/lib/canvas-config";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { addXp } from "@/lib/game";

class BucketError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Pot de peinture : remplit toutes les cases VIDES d'une zone 3×3 avec ta couleur.
// Consomme 1 pot — les pixels créés ne coûtent aucun crédit.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`bucket:${user.id}`, 10, 10_000)) return tooMany();

  const body = await req.json().catch(() => ({}));
  const x = Number(body.x);
  const y = Number(body.y);
  const color = String(body.color || "").toLowerCase();
  if (!isInsideGrid(x, y))
    return NextResponse.json({ error: "Hors de la grille." }, { status: 400 });
  if (!isValidHexColor(color))
    return NextResponse.json({ error: "Couleur invalide." }, { status: 400 });

  try {
    const placed = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new BucketError(401, "Non connecté.");
      const admin = isAdminUser(dbUser);

      const coords: { x: number; y: number }[] = [];
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (isInsideGrid(nx, ny)) coords.push({ x: nx, y: ny });
        }

      const existing = await tx.pixel.findMany({
        where: { OR: coords.map((c) => ({ x: c.x, y: c.y })) },
        select: { x: true, y: true },
      });
      const taken = new Set(existing.map((p) => `${p.x}:${p.y}`));
      const empty = coords.filter((c) => !taken.has(`${c.x}:${c.y}`));

      if (empty.length === 0)
        throw new BucketError(400, "Aucune case vide dans cette zone.");

      if (!admin) {
        const item = await tx.inventoryItem.findUnique({
          where: { userId_sku: { userId: dbUser.id, sku: "bucket" } },
        });
        if (!item || item.quantity < 1)
          throw new BucketError(402, "Aucun pot de peinture en stock (boutique).");
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: 1 } },
        });
      }

      await tx.pixel.createMany({
        data: empty.map((c) => ({
          x: c.x,
          y: c.y,
          color,
          ownerId: dbUser.id,
          updatedAt: new Date(),
        })),
        skipDuplicates: true,
      });
      await tx.user.update({
        where: { id: dbUser.id },
        data: { totalPlaced: { increment: empty.length } },
      });

      return empty;
    });

    try {
      await addXp(user.id, 5 * placed.length);
    } catch {
      /* best effort */
    }

    return NextResponse.json({ ok: true, placed, color });
  } catch (e) {
    if (e instanceof BucketError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("bucket error", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
