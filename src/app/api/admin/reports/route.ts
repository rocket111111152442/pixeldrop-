import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// File des signalements (admin).
export async function GET() {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const reports = await prisma.report.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { reporter: { select: { pseudo: true } } },
  });

  // Joint l'état actuel du pixel signalé.
  const out = [];
  for (const r of reports) {
    const pixel = await prisma.pixel.findUnique({
      where: { x_y: { x: r.x, y: r.y } },
      select: { color: true, link: true, text: true, owner: { select: { pseudo: true } } },
    });
    out.push({
      id: r.id,
      x: r.x,
      y: r.y,
      reason: r.reason,
      by: r.reporter?.pseudo ?? "?",
      at: r.createdAt,
      pixel: pixel
        ? { color: pixel.color, link: pixel.link, text: pixel.text, owner: pixel.owner?.pseudo ?? "?" }
        : null,
    });
  }

  return NextResponse.json({ reports: out });
}

// Traiter un signalement : "resolve" (ignorer) ou "delete_pixel" (supprime le pixel).
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "resolve");
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report)
    return NextResponse.json({ error: "Signalement introuvable." }, { status: 404 });

  if (action === "delete_pixel") {
    await prisma.pixel.deleteMany({ where: { x: report.x, y: report.y } });
  }
  await prisma.report.update({ where: { id }, data: { status: "resolved" } });

  return NextResponse.json({ ok: true });
}
