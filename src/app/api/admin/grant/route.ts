import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ITEM_LABELS } from "@/lib/products";

// L'admin offre des crédits (pixels) ou des items à un compte.
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const credits = Number.isFinite(Number(body.credits)) ? Math.trunc(Number(body.credits)) : 0;
  const itemSku = body.itemSku ? String(body.itemSku) : null;
  const itemQty = Number.isFinite(Number(body.itemQty)) ? Math.trunc(Number(body.itemQty)) : 0;

  if (!userId)
    return NextResponse.json({ error: "userId manquant." }, { status: 400 });

  if (credits !== 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: credits } },
    });
  }

  if (itemSku && ITEM_LABELS[itemSku] && itemQty !== 0) {
    await prisma.inventoryItem.upsert({
      where: { userId_sku: { userId, sku: itemSku } },
      create: { userId, sku: itemSku, quantity: Math.max(0, itemQty) },
      update: { quantity: { increment: itemQty } },
    });
  }

  return NextResponse.json({ ok: true });
}
