import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInsideGrid } from "@/lib/canvas-config";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { addXp, awardAchievements, levelAchievements, XP_BOMB } from "@/lib/game";
import { bumpQuests } from "@/lib/quests";

class BombError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// bomb = 1 case, mega = 3×3, nuke = 5×5
const KINDS: Record<string, { sku: string; radius: number }> = {
  bomb: { sku: "bomb", radius: 0 },
  mega: { sku: "mega_bomb", radius: 1 },
  nuke: { sku: "nuke", radius: 2 },
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });
  if (!rateLimit(`bomb:${user.id}`, 10, 10_000)) return tooMany();

  const body = await req.json().catch(() => ({}));
  const x = Number(body.x);
  const y = Number(body.y);
  let kindName = String(body.kind || "");
  if (!kindName) kindName = body.mega ? "mega" : "bomb"; // compat
  const kind = KINDS[kindName];
  if (!kind) return NextResponse.json({ error: "Type de bombe inconnu." }, { status: 400 });
  if (!isInsideGrid(x, y))
    return NextResponse.json({ error: "Hors de la grille." }, { status: 400 });

  try {
    const removed = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new BombError(401, "Non connecté.");
      const admin = isAdminUser(dbUser);

      const coords: { x: number; y: number }[] = [];
      for (let dx = -kind.radius; dx <= kind.radius; dx++)
        for (let dy = -kind.radius; dy <= kind.radius; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (isInsideGrid(nx, ny)) coords.push({ x: nx, y: ny });
        }

      const targets = await tx.pixel.findMany({
        where: { OR: coords.map((c) => ({ x: c.x, y: c.y })) },
      });

      // Détruisables : cailloux d'autrui. La mousse protectrice ne résiste
      // qu'à la PIOCHE — la masse et la dynamite passent au travers.
      // (L'admin ignore toutes ces règles.)
      const destroyable = targets.filter((p) => {
        if (admin) return true;
        if (p.ownerId === dbUser.id) return false;
        if (p.shielded && kindName === "bomb") return false;
        return true;
      });

      if (destroyable.length === 0) {
        throw new BombError(400, "Rien à détruire ici (vide, protégé, ou à toi).");
      }

      if (!admin) {
        const item = await tx.inventoryItem.findUnique({
          where: { userId_sku: { userId: dbUser.id, sku: kind.sku } },
        });
        if (!item || item.quantity < 1)
          throw new BombError(402, "Tu n'as pas cet explosif en stock (boutique).");
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: 1 } },
        });
      }

      await tx.pixel.deleteMany({
        where: { id: { in: destroyable.map((p) => p.id) } },
      });

      return destroyable.map((p) => ({ x: p.x, y: p.y }));
    });

    // Quêtes collectives (best effort).
    bumpQuests("bomb", { count: removed.length });

    let xpState = { xp: 0, level: 1, leveledUp: false };
    let newAchievements: string[] = [];
    try {
      xpState = await addXp(user.id, XP_BOMB);
      newAchievements = await awardAchievements(user.id, [
        "bomber",
        ...levelAchievements(xpState.level),
      ]);
    } catch {
      /* best effort */
    }

    return NextResponse.json({
      ok: true,
      removed,
      xp: xpState.xp,
      level: xpState.level,
      leveledUp: xpState.leveledUp,
      newAchievements,
    });
  } catch (e) {
    if (e instanceof BombError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("bomb error", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
