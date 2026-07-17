import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Historique d'achats du joueur connecté.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const purchases = await prisma.purchase.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      sku: true,
      label: true,
      amountCts: true,
      status: true,
      result: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    { purchases },
    { headers: { "Cache-Control": "no-store" } },
  );
}
