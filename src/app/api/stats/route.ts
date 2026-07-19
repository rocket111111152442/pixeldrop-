import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOTAL_PIXELS } from "@/lib/canvas-config";

export const dynamic = "force-dynamic";

// Statistiques publiques : remplissage, joueurs, connectés, couleurs populaires.
export async function GET() {
  const twoMinAgo = new Date(Date.now() - 2 * 60_000);
  const [pixelCount, userCount, online, topColors, paidPurchases] = await Promise.all([
    prisma.pixel.count(),
    prisma.user.count({ where: { banned: false } }),
    prisma.user.count({ where: { lastSeenAt: { gte: twoMinAgo } } }),
    prisma.pixel.groupBy({
      by: ["color"],
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),
    prisma.purchase.aggregate({
      where: { status: "paid" },
      _sum: { amountCts: true },
      _count: { _all: true },
    }),
  ]);
  const paidRevenueCts = paidPurchases._sum.amountCts ?? 0;
  const charityAmountCts = Math.round((paidRevenueCts * 5) / 100);

  return NextResponse.json(
    {
      pixelCount,
      totalPixels: TOTAL_PIXELS,
      fillPct: (pixelCount / TOTAL_PIXELS) * 100,
      userCount,
      online,
      charityAmountCts,
      paidOrders: paidPurchases._count._all,
      topColors: topColors.map((c) => ({ color: c.color, count: c._count._all })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
