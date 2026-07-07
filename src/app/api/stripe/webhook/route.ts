import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getProduct } from "@/lib/products";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Le webhook doit lire le corps brut pour vérifier la signature.
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
    await fulfill(session);
  }

  return NextResponse.json({ received: true });
}

async function fulfill(session: Stripe.Checkout.Session) {
  const purchaseId = session.metadata?.purchaseId;
  const userId = session.metadata?.userId;
  const sku = session.metadata?.sku;
  if (!purchaseId || !userId || !sku) return;

  const product = getProduct(sku);
  if (!product) return;

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase || purchase.status === "paid") return; // idempotent

    await tx.purchase.update({
      where: { id: purchaseId },
      data: { status: "paid" },
    });

    // Créditer des pixels ou accorder des items.
    if (product.kind === "credits" && product.credits) {
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: { increment: product.credits },
          totalSpentCts: { increment: product.amountCts },
        },
      });
    } else if (product.kind === "item" && product.itemSku && product.itemQty) {
      await tx.inventoryItem.upsert({
        where: { userId_sku: { userId, sku: product.itemSku } },
        create: { userId, sku: product.itemSku, quantity: product.itemQty },
        update: { quantity: { increment: product.itemQty } },
      });
      await tx.user.update({
        where: { id: userId },
        data: { totalSpentCts: { increment: product.amountCts } },
      });
    }
  });
}
