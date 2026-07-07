import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Snapshot complet du canvas (uniquement les pixels posés — grille creuse).
// Format compact : { p: [[x, y, color, golden, hasInfo], ...] }
export async function GET() {
  const pixels = await prisma.pixel.findMany({
    select: { x: true, y: true, color: true, golden: true, link: true, text: true },
  });

  const p = pixels.map((px) => [
    px.x,
    px.y,
    px.color,
    px.golden ? 1 : 0,
    px.link || px.text ? 1 : 0,
  ]);

  return NextResponse.json(
    { p, count: p.length, ts: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
