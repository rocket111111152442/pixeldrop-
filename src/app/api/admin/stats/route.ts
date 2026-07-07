import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TOTAL_PIXELS } from "@/lib/canvas-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const [userCount, pixelCount, paid] = await Promise.all([
    prisma.user.count(),
    prisma.pixel.count(),
    prisma.purchase.aggregate({
      where: { status: "paid" },
      _sum: { amountCts: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    userCount,
    pixelCount,
    totalPixels: TOTAL_PIXELS,
    fillPct: (pixelCount / TOTAL_PIXELS) * 100,
    revenueCts: paid._sum.amountCts ?? 0,
    paidOrders: paid._count,
  });
}
