import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInsideGrid } from "@/lib/canvas-config";
import { rateLimit, tooMany } from "@/lib/rate-limit";

class MoveError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Déplace un de TES pixels vers une case vide (item "mover").
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`move:${user.id}`, 15, 10_000)) return tooMany();

  const body = await req.json().catch(() => ({}));
  const fromX = Number(body.fromX);
  const fromY = Number(body.fromY);
  const toX = Number(body.toX);
  const toY = Number(body.toY);
  if (!isInsideGrid(fromX, fromY) || !isInsideGrid(toX, toY))
    return NextResponse.json({ error: "Hors de la grille." }, { status: 400 });
  if (fromX === toX && fromY === toY)
    return NextResponse.json({ error: "Même case." }, { status: 400 });

  try {
    const moved = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new MoveError(401, "Non connecté.");
      const admin = isAdminUser(dbUser);

      const pixel = await tx.pixel.findUnique({ where: { x_y: { x: fromX, y: fromY } } });
      if (!pixel) throw new MoveError(404, "Aucun caillou sur la case de départ.");
      if (!admin && pixel.ownerId !== dbUser.id)
        throw new MoveError(403, "Ce caillou ne t'appartient pas.");

      const target = await tx.pixel.findUnique({ where: { x_y: { x: toX, y: toY } } });
      if (target) throw new MoveError(409, "La case d'arrivée est occupée.");

      if (!admin) {
        const item = await tx.inventoryItem.findUnique({
          where: { userId_sku: { userId: dbUser.id, sku: "mover" } },
        });
        if (!item || item.quantity < 1)
          throw new MoveError(402, "Aucun déplaceur en stock (boutique).");
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: 1 } },
        });
      }

      const updated = await tx.pixel.update({
        where: { id: pixel.id },
        data: { x: toX, y: toY },
      });
      return updated;
    });

    return NextResponse.json({
      ok: true,
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY },
      pixel: {
        color: moved.color,
        effect: moved.effect,
        info: !!(moved.link || moved.text),
      },
    });
  } catch (e) {
    if (e instanceof MoveError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    if ((e as { code?: string })?.code === "P2002")
      return NextResponse.json({ error: "La case d'arrivée vient d'être prise." }, { status: 409 });
    console.error("move error", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
