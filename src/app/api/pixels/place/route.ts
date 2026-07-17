import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInsideGrid, isValidHexColor, GRID_WIDTH, GRID_HEIGHT } from "@/lib/canvas-config";
import { cleanLink, cleanText } from "@/lib/security";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { addXp, awardAchievements, levelAchievements, XP_PLACE } from "@/lib/game";

class PlaceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const EFFECTS = new Set(["golden", "rainbow", "diamond"]);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`place:${user.id}`, 30, 10_000)) return tooMany();

  const body = await req.json().catch(() => ({}));
  const x = Number(body.x);
  const y = Number(body.y);
  const color = String(body.color || "").toLowerCase();

  if (!isInsideGrid(x, y))
    return NextResponse.json({ error: "Hors de la grille." }, { status: 400 });
  if (!isValidHexColor(color))
    return NextResponse.json({ error: "Couleur invalide." }, { status: 400 });

  const link = cleanLink(body.link);
  if (link === "invalid")
    return NextResponse.json(
      { error: "Lien invalide (http:// ou https:// uniquement)." },
      { status: 400 },
    );
  const text = cleanText(body.text, 140);

  // Effet spécial (consomme un item, remplace le coût en crédit).
  let effect: string | null = body.effect ? String(body.effect) : null;
  if (!effect && body.golden) effect = "golden"; // compat ancienne version
  if (effect && !EFFECTS.has(effect))
    return NextResponse.json({ error: "Effet inconnu." }, { status: 400 });
  const wantShield = Boolean(body.shield);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new PlaceError(401, "Non connecté.");
      if (dbUser.banned) throw new PlaceError(403, "Compte banni.");
      const admin = isAdminUser(dbUser);

      const existing = await tx.pixel.findUnique({ where: { x_y: { x, y } } });

      // Une case occupée est verrouillée — seul l'admin peut poser par-dessus.
      if (existing && !admin) {
        throw new PlaceError(409, "Cette case est déjà occupée. Choisis une case libre.");
      }

      // Consommation d'items (l'admin ne consomme rien).
      if (effect && !admin) {
        const item = await tx.inventoryItem.findUnique({
          where: { userId_sku: { userId: dbUser.id, sku: effect } },
        });
        if (!item || item.quantity < 1)
          throw new PlaceError(402, "Aucun item de cet effet en stock (boutique).");
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: 1 } },
        });
      }
      if (wantShield && !admin) {
        const item = await tx.inventoryItem.findUnique({
          where: { userId_sku: { userId: dbUser.id, sku: "shield" } },
        });
        if (!item || item.quantity < 1)
          throw new PlaceError(402, "Aucun bouclier en stock (boutique).");
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: 1 } },
        });
      }

      // Coût en crédit : nouveau pixel, sans effet, hors admin.
      if (!existing && !admin && !effect) {
        if (dbUser.credits < 1)
          throw new PlaceError(402, "Plus de cailloux ! Prends un sac dans la boutique.");
        await tx.user.update({
          where: { id: dbUser.id },
          data: { credits: { decrement: 1 }, totalPlaced: { increment: 1 } },
        });
      } else {
        await tx.user.update({
          where: { id: dbUser.id },
          data: { totalPlaced: { increment: 1 } },
        });
      }

      const pixelData = {
        color,
        link,
        text,
        effect,
        golden: effect === "golden",
        shielded: wantShield || (existing?.shielded ?? false),
        ownerId: dbUser.id,
      };
      const pixel = existing
        ? await tx.pixel.update({ where: { x_y: { x, y } }, data: pixelData })
        : await tx.pixel.create({ data: { x, y, ...pixelData } });

      const fresh = await tx.user.findUnique({
        where: { id: dbUser.id },
        select: { credits: true, totalPlaced: true },
      });

      return {
        pixel,
        credits: fresh?.credits ?? 0,
        totalPlaced: fresh?.totalPlaced ?? 0,
      };
    });

    // Progression (hors transaction — best effort).
    let xpState = { xp: 0, level: 1, leveledUp: false };
    let newAchievements: string[] = [];
    try {
      xpState = await addXp(user.id, XP_PLACE);
      const candidates: string[] = ["first_pixel"];
      if (result.totalPlaced >= 10) candidates.push("pixels_10");
      if (result.totalPlaced >= 100) candidates.push("pixels_100");
      if (result.totalPlaced >= 1000) candidates.push("pixels_1000");
      if (link) candidates.push("first_link");
      if (text) candidates.push("first_text");
      if (effect) candidates.push("first_effect");
      const maxX = GRID_WIDTH - 1;
      const maxY = GRID_HEIGHT - 1;
      if ((x === 0 || x === maxX) && (y === 0 || y === maxY))
        candidates.push("corner_stone");
      if ((x === 499 || x === 500) && (y === 499 || y === 500))
        candidates.push("dead_center");
      const owned = await prisma.pixel.count({ where: { ownerId: user.id } });
      if (owned >= 100) candidates.push("landlord");
      candidates.push(...levelAchievements(xpState.level));
      newAchievements = await awardAchievements(user.id, candidates);
    } catch {
      /* la pose a réussi : la progression ne doit pas la faire échouer */
    }

    return NextResponse.json({
      ok: true,
      credits: result.credits,
      xp: xpState.xp,
      level: xpState.level,
      leveledUp: xpState.leveledUp,
      newAchievements,
    });
  } catch (e) {
    if (e instanceof PlaceError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    if ((e as { code?: string })?.code === "P2002")
      return NextResponse.json(
        { error: "Cette case vient d'être prise par un autre joueur." },
        { status: 409 },
      );
    console.error("place error", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
