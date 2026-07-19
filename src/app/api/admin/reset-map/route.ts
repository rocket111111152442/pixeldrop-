import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { redactError } from "@/lib/security";

export const runtime = "nodejs";

// Phrase exacte à envoyer pour confirmer. Sans elle, rien n'est supprimé :
// une opération irréversible ne doit jamais partir sur un clic accidentel.
const CONFIRM_PHRASE = "VIDER LA CARTE";

/**
 * Vide entièrement la clairière (supprime tous les cailloux posés).
 * Réservé à l'administrateur. Irréversible.
 *
 * Option `refund` : recrédite à chaque joueur autant de cailloux qu'il en
 * possédait sur la carte, pour ne pas le léser.
 */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  if (!rateLimit(`reset-map:${me!.id}`, 3, 60 * 60_000)) return tooMany();

  const body = await req.json().catch(() => ({}));
  if (String(body.confirm || "").trim().toUpperCase() !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Confirmation manquante. Écris exactement : ${CONFIRM_PHRASE}` },
      { status: 400 },
    );
  }
  const refund = body.refund === true;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const total = await tx.pixel.count();

      let refunded = 0;
      let players = 0;
      if (refund) {
        // Combien de cailloux chaque joueur possède-t-il sur la carte ?
        const byOwner = await tx.pixel.groupBy({
          by: ["ownerId"],
          where: { ownerId: { not: null } },
          _count: { _all: true },
        });
        for (const row of byOwner) {
          if (!row.ownerId) continue;
          await tx.user.update({
            where: { id: row.ownerId },
            data: { credits: { increment: row._count._all } },
          });
          refunded += row._count._all;
          players++;
        }
      }

      await tx.pixel.deleteMany({});
      return { total, refunded, players };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("reset-map error", redactError(e));
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
