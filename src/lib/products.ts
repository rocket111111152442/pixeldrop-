// Catalogue des produits achetables via Stripe.
// Prix en centimes d'euro. Le prix "de base" du pixel est 10 cts.
// Les gros packs offrent un meilleur prix unitaire (dégressif).

export type Product = {
  sku: string;
  kind: "credits" | "item";
  label: string;
  description: string;
  emoji: string;
  amountCts: number; // prix total du pack, en centimes d'euro
  credits?: number; // nombre de pixels crédités (kind = "credits")
  itemSku?: string; // clé d'item d'inventaire (kind = "item")
  itemQty?: number; // quantité d'items accordée
  highlight?: boolean; // pack "populaire"
};

export const PRODUCTS: Product[] = [
  // ── Packs de pixels (crédits) ──
  {
    sku: "credits_10",
    kind: "credits",
    label: "10 pixels",
    description: "0.10 € / pixel",
    emoji: "🎨",
    amountCts: 100,
    credits: 10,
  },
  {
    sku: "credits_50",
    kind: "credits",
    label: "50 pixels",
    description: "0.09 € / pixel · -10%",
    emoji: "🖌️",
    amountCts: 450,
    credits: 50,
  },
  {
    sku: "credits_100",
    kind: "credits",
    label: "100 pixels",
    description: "0.08 € / pixel · -20%",
    emoji: "✨",
    amountCts: 800,
    credits: 100,
    highlight: true,
  },
  {
    sku: "credits_500",
    kind: "credits",
    label: "500 pixels",
    description: "0.07 € / pixel · -30%",
    emoji: "🚀",
    amountCts: 3500,
    credits: 500,
  },
  {
    sku: "credits_1000",
    kind: "credits",
    label: "1000 pixels",
    description: "0.06 € / pixel · -40%",
    emoji: "🏆",
    amountCts: 6000,
    credits: 1000,
  },

  // ── Items / power-ups ──
  {
    sku: "bomb_1",
    kind: "item",
    label: "Bombe ×1",
    description: "Détruit 1 pixel adverse",
    emoji: "💣",
    amountCts: 50,
    itemSku: "bomb",
    itemQty: 1,
  },
  {
    sku: "bomb_5",
    kind: "item",
    label: "Bombe ×5",
    description: "Lot de 5 bombes · -20%",
    emoji: "💣",
    amountCts: 200,
    itemSku: "bomb",
    itemQty: 5,
    highlight: true,
  },
  {
    sku: "mega_bomb_1",
    kind: "item",
    label: "Méga-bombe ×1",
    description: "Détruit une zone 3×3 adverse",
    emoji: "💥",
    amountCts: 200,
    itemSku: "mega_bomb",
    itemQty: 1,
  },
  {
    sku: "shield_1",
    kind: "item",
    label: "Bouclier ×1",
    description: "Protège 1 de tes pixels des bombes",
    emoji: "🛡️",
    amountCts: 100,
    itemSku: "shield",
    itemQty: 1,
  },
  {
    sku: "golden_1",
    kind: "item",
    label: "Pixel doré ×1",
    description: "Pose un pixel doré animé et brillant",
    emoji: "⭐",
    amountCts: 150,
    itemSku: "golden",
    itemQty: 1,
  },
];

export function getProduct(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

export const ITEM_LABELS: Record<string, { label: string; emoji: string }> = {
  bomb: { label: "Bombe", emoji: "💣" },
  mega_bomb: { label: "Méga-bombe", emoji: "💥" },
  shield: { label: "Bouclier", emoji: "🛡️" },
  golden: { label: "Pixel doré", emoji: "⭐" },
};
