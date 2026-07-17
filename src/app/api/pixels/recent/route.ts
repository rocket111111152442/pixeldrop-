import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Flux d'activité public : les 12 derniers pixels posés/modifiés.
export async function GET() {
  const pixels = await prisma.pixel.findMany({
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: {
      x: true,
      y: true,
      color: true,
      effect: true,
      updatedAt: true,
      owner: { select: { pseudo: true, level: true } },
    },
  });

  return NextResponse.json(
    {
      recent: pixels.map((p) => ({
        x: p.x,
        y: p.y,
        color: p.color,
        effect: p.effect,
        at: p.updatedAt,
        pseudo: p.owner?.pseudo ?? "?",
        level: p.owner?.level ?? 1,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
