import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInsideGrid, isValidHexColor } from "@/lib/canvas-config";
import { rateLimit, tooMany } from "@/lib/rate-limit";

// Recolorateur : change la couleur d'un de TES pixels (item "swap").
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`swap:${user.id}`, 20, 10_000)) return tooMany();

  const body = await req.json().catch(() => ({}));
  const x = Number(body.x);
  const y = Number(body.y);
  const color = String(body.color || "").toLowerCase();
  if (!isInsideGrid(x, y))
    return NextResponse.json({ error: "Hors de la grille." }, { status: 400 });
  if (!isValidHexColor(color))
    return NextResponse.json({ error: "Couleur invalide." }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new Error("401");
      const admin = isAdminUser(dbUser);

      const pixel = await tx.pixel.findUnique({ where: { x_y: { x, y } } });
      if (!pixel) throw new Error("404");
      if (!admin && pixel.ownerId !== dbUser.id) throw new Error("403");

      if (!admin) {
        const item = await tx.inventoryItem.findUnique({
          where: { userId_sku: { userId: dbUser.id, sku: "swap" } },
        });
        if (!item || item.quantity < 1) throw new Error("402");
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: 1 } },
        });
      }

      await tx.pixel.update({ where: { id: pixel.id }, data: { color } });
    });

    return NextResponse.json({ ok: true, x, y, color });
  } catch (e) {
    const code = (e as Error).message;
    if (code === "404")
      return NextResponse.json({ error: "Aucun pixel sur cette case." }, { status: 404 });
    if (code === "403")
      return NextResponse.json({ error: "Ce pixel ne t'appartient pas." }, { status: 403 });
    if (code === "402")
      return NextResponse.json({ error: "Aucun recolorateur en stock (boutique)." }, { status: 402 });
    if (code === "401")
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    console.error("swap error", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
