import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOTAL_PIXELS } from "@/lib/canvas-config";

export const dynamic = "force-dynamic";

// Statistiques publiques : remplissage, joueurs, connectés, couleurs populaires.
export async function GET() {
  const twoMinAgo = new Date(Date.now() - 2 * 60_000);
  const [pixelCount, userCount, online, topColors] = await Promise.all([
    prisma.pixel.count(),
    prisma.user.count({ where: { banned: false } }),
    prisma.user.count({ where: { lastSeenAt: { gte: twoMinAgo } } }),
    prisma.pixel.groupBy({
      by: ["color"],
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),
  ]);

  return NextResponse.json(
    {
      pixelCount,
      totalPixels: TOTAL_PIXELS,
      fillPct: (pixelCount / TOTAL_PIXELS) * 100,
      userCount,
      online,
      topColors: topColors.map((c) => ({ color: c.color, count: c._count._all })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
