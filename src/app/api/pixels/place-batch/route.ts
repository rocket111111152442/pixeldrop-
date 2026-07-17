import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInsideGrid, isValidHexColor } from "@/lib/canvas-config";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { addXp } from "@/lib/game";

const MAX_CELLS = 500;

// Pose en lot (mode pinceau) : plusieurs cailloux d'une même couleur.
// Coût = nombre de cases NOUVELLES réellement posées (plafonné aux crédits).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`batch:${user.id}`, 20, 10_000)) return tooMany();

  const body = await req.json().catch(() => ({}));
  const color = String(body.color || "").toLowerCase();
  if (!isValidHexColor(color))
    return NextResponse.json({ error: "Couleur invalide." }, { status: 400 });

  const raw = Array.isArray(body.cells) ? body.cells : [];
  // Dédoublonne + valide.
  const seen = new Set<string>();
  const cells: { x: number; y: number }[] = [];
  for (const c of raw) {
    const x = Number(c?.x);
    const y = Number(c?.y);
    if (!isInsideGrid(x, y)) continue;
    const k = `${x}:${y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    cells.push({ x, y });
    if (cells.length >= MAX_CELLS) break;
  }
  if (cells.length === 0)
    return NextResponse.json({ ok: true, placed: [], credits: user.credits });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new Error("401");
      const admin = isAdminUser(dbUser);

      const existing = await tx.pixel.findMany({
        where: { OR: cells.map((c) => ({ x: c.x, y: c.y })) },
        select: { x: true, y: true },
      });
      const taken = new Set(existing.map((p) => `${p.x}:${p.y}`));
      let free = cells.filter((c) => !taken.has(`${c.x}:${c.y}`));

      if (!admin) {
        // Limité au nombre de crédits disponibles.
        free = free.slice(0, Math.max(0, dbUser.credits));
      }
      if (free.length === 0)
        return { placed: [] as { x: number; y: number }[], credits: dbUser.credits };

      await tx.pixel.createMany({
        data: free.map((c) => ({
          x: c.x,
          y: c.y,
          color,
          ownerId: dbUser.id,
          updatedAt: new Date(),
        })),
        skipDuplicates: true,
      });

      const updated = await tx.user.update({
        where: { id: dbUser.id },
        data: {
          totalPlaced: { increment: free.length },
          ...(admin ? {} : { credits: { decrement: free.length } }),
        },
        select: { credits: true },
      });

      return { placed: free, credits: updated.credits };
    });

    if (result.placed.length > 0) {
      addXp(user.id, 2 * result.placed.length).catch(() => {});
    }

    return NextResponse.json({ ok: true, placed: result.placed, credits: result.credits });
  } catch (e) {
    if ((e as Error).message === "401")
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    console.error("place-batch error", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
