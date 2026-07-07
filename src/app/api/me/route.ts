import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// État du joueur connecté : pseudo, crédits, inventaire, stats.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false });

  const items = await prisma.inventoryItem.findMany({
    where: { userId: user.id },
  });

  return NextResponse.json({
    authenticated: true,
    id: user.id,
    pseudo: user.pseudo,
    email: user.email,
    image: user.image,
    isAdmin: isAdminUser(user),
    banned: user.banned,
    credits: user.credits,
    totalPlaced: user.totalPlaced,
    inventory: Object.fromEntries(items.map((i) => [i.sku, i.quantity])),
  });
}
