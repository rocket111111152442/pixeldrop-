import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NAME_COLOR_VALUES } from "@/lib/products";
import { rateLimit, tooMany } from "@/lib/rate-limit";

// Équiper / retirer badge, titre, couleur de pseudo (doivent être possédés).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned) return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`equip:${user.id}`, 20, 60_000)) return tooMany();

  const body = await req.json().catch(() => ({}));

  async function owns(sku: string): Promise<boolean> {
    const item = await prisma.inventoryItem.findUnique({
      where: { userId_sku: { userId: user!.id, sku } },
    });
    return !!item && item.quantity > 0;
  }

  const data: { equippedBadge?: string | null; equippedTitle?: string | null; nameColor?: string | null } = {};

  if ("badge" in body) {
    const sku = String(body.badge || "");
    if (!sku) data.equippedBadge = null;
    else if (sku.startsWith("badge_") && (await owns(sku))) data.equippedBadge = sku;
    else return NextResponse.json({ error: "Badge non possédé." }, { status: 403 });
  }
  if ("title" in body) {
    const sku = String(body.title || "");
    if (!sku) data.equippedTitle = null;
    else if (sku.startsWith("title_") && (await owns(sku))) data.equippedTitle = sku;
    else return NextResponse.json({ error: "Titre non possédé." }, { status: 403 });
  }
  if ("nameColor" in body) {
    const sku = String(body.nameColor || "");
    if (!sku) data.nameColor = null;
    else if (NAME_COLOR_VALUES[sku] && (await owns(sku)))
      data.nameColor = NAME_COLOR_VALUES[sku];
    else return NextResponse.json({ error: "Couleur non possédée." }, { status: 403 });
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Rien à équiper." }, { status: 400 });

  await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true, ...data });
}
