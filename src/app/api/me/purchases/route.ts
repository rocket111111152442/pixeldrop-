import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Historique d'achats du joueur connecté.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  const purchases = await prisma.purchase.findMany({
    where: sessionId ? { userId: user.id, stripeSessionId: sessionId } : { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: sessionId ? 1 : 20,
    select: {
      id: true,
      sku: true,
      label: true,
      amountCts: true,
      creditsGranted: true,
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
