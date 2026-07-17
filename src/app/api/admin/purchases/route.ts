import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Journal des achats (admin) — 100 derniers.
export async function GET() {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { pseudo: true, email: true } } },
  });

  return NextResponse.json({
    purchases: purchases.map((p) => ({
      id: p.id,
      pseudo: p.user.pseudo,
      email: p.user.email,
      label: p.label,
      amountCts: p.amountCts,
      status: p.status,
      result: p.result,
      at: p.createdAt,
    })),
  });
}
