import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const EFFECT_CODE: Record<string, number> = { golden: 1, rainbow: 2, diamond: 3 };

// Snapshot complet du canvas (grille creuse — public, lecture seule).
// Format compact : { p: [[x, y, color, effet(0-3), aInfo(0/1)], ...] }
export async function GET() {
  const pixels = await prisma.pixel.findMany({
    select: { x: true, y: true, color: true, golden: true, effect: true, link: true, text: true },
  });

  const p = pixels.map((px) => [
    px.x,
    px.y,
    px.color,
    px.effect ? EFFECT_CODE[px.effect] ?? 0 : px.golden ? 1 : 0,
    px.link || px.text ? 1 : 0,
  ]);

  return NextResponse.json(
    { p, count: p.length, ts: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
