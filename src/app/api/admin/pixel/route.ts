import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInsideGrid } from "@/lib/canvas-config";

// Suppression admin : un pixel précis, ou une zone rectangulaire.
export async function DELETE(req: Request) {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  // Zone : {x, y, w, h}
  if (body.w !== undefined || body.h !== undefined) {
    const x = Number(body.x);
    const y = Number(body.y);
    const w = Math.min(Math.max(1, Number(body.w) || 1), 100);
    const h = Math.min(Math.max(1, Number(body.h) || 1), 100);
    if (!isInsideGrid(x, y))
      return NextResponse.json({ error: "Coordonnées invalides." }, { status: 400 });

    const res = await prisma.pixel.deleteMany({
      where: {
        x: { gte: x, lt: x + w },
        y: { gte: y, lt: y + h },
      },
    });
    return NextResponse.json({ ok: true, removed: res.count });
  }

  // Pixel unique : {x, y}
  const x = Number(body.x);
  const y = Number(body.y);
  if (!isInsideGrid(x, y))
    return NextResponse.json({ error: "Coordonnées invalides." }, { status: 400 });

  await prisma.pixel.deleteMany({ where: { x, y } });
  return NextResponse.json({ ok: true, removed: 1 });
}
