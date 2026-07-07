import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInsideGrid, isValidHexColor } from "@/lib/canvas-config";

class PlaceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function cleanLink(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return s.slice(0, 500);
  } catch {
    /* ignore */
  }
  throw new PlaceError(400, "Lien invalide (doit commencer par http:// ou https://).");
}

function cleanText(v: unknown): string | null {
  // Garde uniquement les caractères imprimables (>= espace, hors DEL).
  const raw = String(v ?? "");
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 32 && code !== 127) out += ch;
  }
  const s = out.trim();
  if (!s) return null;
  return s.slice(0, 140);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const x = Number(body.x);
  const y = Number(body.y);
  const color = String(body.color || "").toLowerCase();

  if (!isInsideGrid(x, y))
    return NextResponse.json({ error: "Hors de la grille." }, { status: 400 });
  if (!isValidHexColor(color))
    return NextResponse.json({ error: "Couleur invalide." }, { status: 400 });

  let link: string | null;
  let text: string | null;
  try {
    link = cleanLink(body.link);
    text = cleanText(body.text);
  } catch (e) {
    if (e instanceof PlaceError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const wantGolden = Boolean(body.golden);
  const wantShield = Boolean(body.shield);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new PlaceError(401, "Non connecté.");
      if (dbUser.banned) throw new PlaceError(403, "Compte banni.");
      const admin = isAdminUser(dbUser);

      const existing = await tx.pixel.findUnique({ where: { x_y: { x, y } } });
      const isMine = existing?.ownerId === dbUser.id;

      if (existing && !isMine && !admin) {
        throw new PlaceError(409, "Ce pixel est déjà occupé par un autre joueur.");
      }

      // Pixel doré (item) : remplace le coût en crédit.
      let golden = existing?.golden ?? false;
      const applyGolden = wantGolden && !golden;
      if (applyGolden) {
        if (!admin) {
          const item = await tx.inventoryItem.findUnique({
            where: { userId_sku: { userId: dbUser.id, sku: "golden" } },
          });
          if (!item || item.quantity < 1)
            throw new PlaceError(402, "Aucun pixel doré en stock (boutique).");
          await tx.inventoryItem.update({
            where: { id: item.id },
            data: { quantity: { decrement: 1 } },
          });
        }
        golden = true;
      }

      // Bouclier (item) sur ton pixel.
      let shielded = existing?.shielded ?? false;
      if (wantShield && !shielded) {
        if (!admin) {
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
        shielded = true;
      }

      const isNew = !existing;

      // Coût en crédit : uniquement pour un NOUVEAU pixel, sans item doré, hors admin.
      if (isNew) {
        if (!admin && !applyGolden) {
          if (dbUser.credits < 1)
            throw new PlaceError(
              402,
              "Plus de pixels ! Achète un pack dans la boutique.",
            );
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
      }

      const pixelData = { color, link, text, golden, shielded, ownerId: dbUser.id };
      const pixel = existing
        ? await tx.pixel.update({ where: { x_y: { x, y } }, data: pixelData })
        : await tx.pixel.create({ data: { x, y, ...pixelData } });

      const fresh = await tx.user.findUnique({
        where: { id: dbUser.id },
        select: { credits: true },
      });

      return { pixel, credits: fresh?.credits ?? 0 };
    });

    return NextResponse.json({ ok: true, credits: result.credits });
  } catch (e) {
    if (e instanceof PlaceError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("place error", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
