import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getProduct } from "@/lib/products";
import { getStripe, CURRENCY } from "@/lib/stripe";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.banned)
    return NextResponse.json({ error: "Compte banni." }, { status: 403 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Les paiements ne sont pas encore configurés (STRIPE_SECRET_KEY)." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const product = getProduct(String(body.sku || ""));
  if (!product) return NextResponse.json({ error: "Produit inconnu." }, { status: 400 });

  const origin =
    process.env.AUTH_URL ||
    req.headers.get("origin") ||
    `https://${req.headers.get("host")}`;

  // Trace la commande (idempotence + réconciliation).
  const purchase = await prisma.purchase.create({
    data: {
      userId: user.id,
      sku: product.sku,
      label: product.label,
      amountCts: product.amountCts,
      creditsGranted: product.credits ?? 0,
      itemsGranted: product.itemQty ?? 0,
      status: "pending",
    },
  });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: product.amountCts,
          product_data: {
            name: `PixelDrop — ${product.label}`,
            description: product.description,
          },
        },
      },
    ],
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/boutique?canceled=1`,
    client_reference_id: user.id,
    metadata: { userId: user.id, sku: product.sku, purchaseId: purchase.id },
  });

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { stripeSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
