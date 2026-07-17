import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProduct, rollMystery } from "@/lib/products";
import { getStripe } from "@/lib/stripe";
import { awardAchievements } from "@/lib/game";

export const dynamic = "force-dynamic";

// Le webhook lit le corps brut pour vérifier la signature Stripe.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "webhook non configuré" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig || "", secret);
  } catch (err) {
    console.error("Signature webhook invalide", err);
    return NextResponse.json({ error: "signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      await fulfill(session);
    }
  }

  return NextResponse.json({ received: true });
}

async function grantItems(
  tx: Prisma.TransactionClient,
  userId: string,
  items: Record<string, number>,
) {
  for (const [sku, qty] of Object.entries(items)) {
    if (qty <= 0) continue;
    await tx.inventoryItem.upsert({
      where: { userId_sku: { userId, sku } },
      create: { userId, sku, quantity: qty },
      update: { quantity: { increment: qty } },
    });
  }
}

async function fulfill(session: Stripe.Checkout.Session) {
  const purchaseId = session.metadata?.purchaseId;
  const userId = session.metadata?.userId;
  const sku = session.metadata?.sku;
  if (!purchaseId || !userId || !sku) return;

  const product = getProduct(sku);
  if (!product) return;

  let totalSpent = 0;

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase || purchase.status === "paid") return; // idempotent

    let result = product.label;

    switch (product.kind) {
      case "credits": {
        await tx.user.update({
          where: { id: userId },
          data: { credits: { increment: product.credits ?? 0 } },
        });
        result = `+${product.credits} cailloux`;
        break;
      }
      case "item": {
        if (product.itemSku && product.itemQty) {
          await grantItems(tx, userId, { [product.itemSku]: product.itemQty });
          result = `+${product.itemQty} × ${product.label}`;
        }
        break;
      }
      case "unlock": {
        // Déblocage permanent (badge/titre/couleur) : quantité fixée à 1.
        if (product.itemSku) {
          await tx.inventoryItem.upsert({
            where: { userId_sku: { userId, sku: product.itemSku } },
            create: { userId, sku: product.itemSku, quantity: 1 },
            update: { quantity: 1 },
          });
          result = `Débloqué : ${product.label}`;
        }
        break;
      }
      case "bundle": {
        const g = product.grants;
        if (g?.credits) {
          await tx.user.update({
            where: { id: userId },
            data: { credits: { increment: g.credits } },
          });
        }
        if (g?.items) await grantItems(tx, userId, g.items);
        result = product.description;
        break;
      }
      case "mystery": {
        const boxes = sku === "mystery_5" ? 5 : 1;
        const labels: string[] = [];
        for (let i = 0; i < boxes; i++) {
          const loot = rollMystery();
          if (loot.credits) {
            await tx.user.update({
              where: { id: userId },
              data: { credits: { increment: loot.credits } },
            });
          }
          if (Object.keys(loot.items).length) await grantItems(tx, userId, loot.items);
          labels.push(loot.label);
        }
        result = "🎁 " + labels.join(" · ");
        break;
      }
    }

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { totalSpentCts: { increment: product.amountCts } },
      select: { totalSpentCts: true },
    });
    totalSpent = updatedUser.totalSpentCts;

    await tx.purchase.update({
      where: { id: purchaseId },
      data: { status: "paid", result },
    });
  });

  try {
    const cand = ["first_buy"];
    if (totalSpent >= 2000) cand.push("big_spender");
    await awardAchievements(userId, cand);
  } catch {
    /* best effort */
  }
}
