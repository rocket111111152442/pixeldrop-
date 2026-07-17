// Catalogue des produits achetables via Stripe.
// Prix en centimes d'euro. Prix de base du pixel : 10 cts, dégressif sur les gros packs.

export type ProductKind = "credits" | "item" | "unlock" | "bundle" | "mystery";
export type ProductCategory =
  | "pixels"
  | "armes"
  | "defense"
  | "effets"
  | "outils"
  | "style"
  | "packs"
  | "mystere";

export type BundleGrant = { credits?: number; items?: Record<string, number> };

export type Product = {
  sku: string;
  kind: ProductKind;
  category: ProductCategory;
  label: string;
  description: string;
  emoji: string;
  amountCts: number;
  credits?: number; // kind = credits
  itemSku?: string; // kind = item | unlock
  itemQty?: number; // kind = item
  grants?: BundleGrant; // kind = bundle
  highlight?: boolean;
};

export const PRODUCTS: Product[] = [
  // ── Packs de pixels ──
  { sku: "credits_10", kind: "credits", category: "pixels", label: "10 pixels", description: "0,10 € / pixel", emoji: "🎨", amountCts: 100, credits: 10 },
  { sku: "credits_25", kind: "credits", category: "pixels", label: "25 pixels", description: "0,096 € / pixel · -4%", emoji: "🖍️", amountCts: 240, credits: 25 },
  { sku: "credits_50", kind: "credits", category: "pixels", label: "50 pixels", description: "0,09 € / pixel · -10%", emoji: "🖌️", amountCts: 450, credits: 50 },
  { sku: "credits_100", kind: "credits", category: "pixels", label: "100 pixels", description: "0,08 € / pixel · -20%", emoji: "✨", amountCts: 800, credits: 100, highlight: true },
  { sku: "credits_200", kind: "credits", category: "pixels", label: "200 pixels", description: "0,075 € / pixel · -25%", emoji: "🌟", amountCts: 1500, credits: 200 },
  { sku: "credits_500", kind: "credits", category: "pixels", label: "500 pixels", description: "0,07 € / pixel · -30%", emoji: "🚀", amountCts: 3500, credits: 500 },
  { sku: "credits_1000", kind: "credits", category: "pixels", label: "1000 pixels", description: "0,06 € / pixel · -40%", emoji: "🏆", amountCts: 6000, credits: 1000 },
  { sku: "credits_2500", kind: "credits", category: "pixels", label: "2500 pixels", description: "0,055 € / pixel · -45%", emoji: "👑", amountCts: 13750, credits: 2500 },
  { sku: "credits_5000", kind: "credits", category: "pixels", label: "5000 pixels", description: "0,05 € / pixel · -50%", emoji: "💰", amountCts: 25000, credits: 5000 },
  { sku: "credits_10000", kind: "credits", category: "pixels", label: "10 000 pixels", description: "0,045 € / pixel · -55%", emoji: "🏦", amountCts: 45000, credits: 10000 },

  // ── Armes ──
  { sku: "bomb_1", kind: "item", category: "armes", label: "Bombe ×1", description: "Détruit 1 pixel adverse", emoji: "💣", amountCts: 50, itemSku: "bomb", itemQty: 1 },
  { sku: "bomb_5", kind: "item", category: "armes", label: "Bombe ×5", description: "Lot de 5 · -20%", emoji: "💣", amountCts: 200, itemSku: "bomb", itemQty: 5, highlight: true },
  { sku: "bomb_10", kind: "item", category: "armes", label: "Bombe ×10", description: "Lot de 10 · -30%", emoji: "💣", amountCts: 350, itemSku: "bomb", itemQty: 10 },
  { sku: "bomb_25", kind: "item", category: "armes", label: "Bombe ×25", description: "Lot de 25 · -40%", emoji: "💣", amountCts: 750, itemSku: "bomb", itemQty: 25 },
  { sku: "mega_bomb_1", kind: "item", category: "armes", label: "Méga-bombe ×1", description: "Détruit une zone 3×3", emoji: "💥", amountCts: 200, itemSku: "mega_bomb", itemQty: 1 },
  { sku: "mega_bomb_3", kind: "item", category: "armes", label: "Méga-bombe ×3", description: "Lot de 3 · -17%", emoji: "💥", amountCts: 500, itemSku: "mega_bomb", itemQty: 3 },
  { sku: "mega_bomb_10", kind: "item", category: "armes", label: "Méga-bombe ×10", description: "Lot de 10 · -25%", emoji: "💥", amountCts: 1500, itemSku: "mega_bomb", itemQty: 10 },
  { sku: "nuke_1", kind: "item", category: "armes", label: "Bombe nucléaire ×1", description: "Rase une zone 5×5 !", emoji: "☢️", amountCts: 500, itemSku: "nuke", itemQty: 1 },
  { sku: "nuke_3", kind: "item", category: "armes", label: "Bombe nucléaire ×3", description: "Lot de 3 · -20%", emoji: "☢️", amountCts: 1200, itemSku: "nuke", itemQty: 3 },

  // ── Défense ──
  { sku: "shield_1", kind: "item", category: "defense", label: "Bouclier ×1", description: "Protège 1 pixel des bombes", emoji: "🛡️", amountCts: 100, itemSku: "shield", itemQty: 1 },
  { sku: "shield_5", kind: "item", category: "defense", label: "Bouclier ×5", description: "Lot de 5 · -20%", emoji: "🛡️", amountCts: 400, itemSku: "shield", itemQty: 5 },
  { sku: "shield_10", kind: "item", category: "defense", label: "Bouclier ×10", description: "Lot de 10 · -30%", emoji: "🛡️", amountCts: 700, itemSku: "shield", itemQty: 10 },

  // ── Effets spéciaux (le pixel posé avec un effet ne coûte pas de crédit) ──
  { sku: "golden_1", kind: "item", category: "effets", label: "Pixel doré ×1", description: "Pixel brillant animé", emoji: "⭐", amountCts: 150, itemSku: "golden", itemQty: 1 },
  { sku: "golden_5", kind: "item", category: "effets", label: "Pixel doré ×5", description: "Lot de 5 · -20%", emoji: "⭐", amountCts: 600, itemSku: "golden", itemQty: 5 },
  { sku: "golden_10", kind: "item", category: "effets", label: "Pixel doré ×10", description: "Lot de 10 · -33%", emoji: "⭐", amountCts: 1000, itemSku: "golden", itemQty: 10 },
  { sku: "rainbow_1", kind: "item", category: "effets", label: "Pixel arc-en-ciel ×1", description: "Change de couleur en boucle", emoji: "🌈", amountCts: 250, itemSku: "rainbow", itemQty: 1 },
  { sku: "rainbow_5", kind: "item", category: "effets", label: "Pixel arc-en-ciel ×5", description: "Lot de 5 · -20%", emoji: "🌈", amountCts: 1000, itemSku: "rainbow", itemQty: 5 },
  { sku: "diamond_1", kind: "item", category: "effets", label: "Pixel diamant ×1", description: "Scintille comme un joyau", emoji: "💎", amountCts: 400, itemSku: "diamond", itemQty: 1 },
  { sku: "diamond_5", kind: "item", category: "effets", label: "Pixel diamant ×5", description: "Lot de 5 · -20%", emoji: "💎", amountCts: 1600, itemSku: "diamond", itemQty: 5 },

  // ── Outils ──
  { sku: "bucket_1", kind: "item", category: "outils", label: "Pot de peinture ×1", description: "Remplit les cases vides d'une zone 3×3", emoji: "🪣", amountCts: 60, itemSku: "bucket", itemQty: 1 },
  { sku: "bucket_5", kind: "item", category: "outils", label: "Pot de peinture ×5", description: "Lot de 5 · -17%", emoji: "🪣", amountCts: 250, itemSku: "bucket", itemQty: 5 },
  { sku: "swap_1", kind: "item", category: "outils", label: "Recolorateur ×1", description: "Change la couleur d'un de TES pixels", emoji: "🎭", amountCts: 30, itemSku: "swap", itemQty: 1 },
  { sku: "swap_5", kind: "item", category: "outils", label: "Recolorateur ×5", description: "Lot de 5 · -20%", emoji: "🎭", amountCts: 120, itemSku: "swap", itemQty: 5 },
  { sku: "swap_10", kind: "item", category: "outils", label: "Recolorateur ×10", description: "Lot de 10 · -33%", emoji: "🎭", amountCts: 200, itemSku: "swap", itemQty: 10 },
  { sku: "mover_1", kind: "item", category: "outils", label: "Déplaceur ×1", description: "Déplace un de TES pixels", emoji: "✈️", amountCts: 40, itemSku: "mover", itemQty: 1 },
  { sku: "mover_5", kind: "item", category: "outils", label: "Déplaceur ×5", description: "Lot de 5 · -20%", emoji: "✈️", amountCts: 160, itemSku: "mover", itemQty: 5 },
  { sku: "eraser_1", kind: "item", category: "outils", label: "Gomme ×1", description: "Efface un de TES pixels", emoji: "🧽", amountCts: 20, itemSku: "eraser", itemQty: 1 },
  { sku: "eraser_10", kind: "item", category: "outils", label: "Gomme ×10", description: "Lot de 10 · -25%", emoji: "🧽", amountCts: 150, itemSku: "eraser", itemQty: 10 },

  // ── Style : badges (affichés à côté du pseudo) ──
  { sku: "badge_star", kind: "unlock", category: "style", label: "Badge Étoile", description: "🌟 à côté de ton pseudo", emoji: "🌟", amountCts: 100, itemSku: "badge_star" },
  { sku: "badge_heart", kind: "unlock", category: "style", label: "Badge Cœur", description: "❤️ à côté de ton pseudo", emoji: "❤️", amountCts: 100, itemSku: "badge_heart" },
  { sku: "badge_fire", kind: "unlock", category: "style", label: "Badge Flamme", description: "🔥 à côté de ton pseudo", emoji: "🔥", amountCts: 150, itemSku: "badge_fire" },
  { sku: "badge_skull", kind: "unlock", category: "style", label: "Badge Crâne", description: "💀 à côté de ton pseudo", emoji: "💀", amountCts: 150, itemSku: "badge_skull" },
  { sku: "badge_ghost", kind: "unlock", category: "style", label: "Badge Fantôme", description: "👻 à côté de ton pseudo", emoji: "👻", amountCts: 200, itemSku: "badge_ghost" },
  { sku: "badge_rocket", kind: "unlock", category: "style", label: "Badge Fusée", description: "🚀 à côté de ton pseudo", emoji: "🚀", amountCts: 200, itemSku: "badge_rocket" },
  { sku: "badge_diamond", kind: "unlock", category: "style", label: "Badge Diamant", description: "💎 à côté de ton pseudo", emoji: "💎", amountCts: 250, itemSku: "badge_diamond" },
  { sku: "badge_crown", kind: "unlock", category: "style", label: "Badge Couronne", description: "👑 à côté de ton pseudo", emoji: "👑", amountCts: 300, itemSku: "badge_crown" },

  // ── Style : titres ──
  { sku: "title_pioneer", kind: "unlock", category: "style", label: "Titre « Pionnier »", description: "Affiché sur ton profil", emoji: "🧭", amountCts: 150, itemSku: "title_pioneer" },
  { sku: "title_artist", kind: "unlock", category: "style", label: "Titre « Artiste »", description: "Affiché sur ton profil", emoji: "🎨", amountCts: 150, itemSku: "title_artist" },
  { sku: "title_warlord", kind: "unlock", category: "style", label: "Titre « Seigneur de guerre »", description: "Affiché sur ton profil", emoji: "⚔️", amountCts: 200, itemSku: "title_warlord" },
  { sku: "title_collector", kind: "unlock", category: "style", label: "Titre « Collectionneur »", description: "Affiché sur ton profil", emoji: "🗃️", amountCts: 200, itemSku: "title_collector" },
  { sku: "title_phantom", kind: "unlock", category: "style", label: "Titre « Fantôme »", description: "Affiché sur ton profil", emoji: "🌫️", amountCts: 250, itemSku: "title_phantom" },
  { sku: "title_legend", kind: "unlock", category: "style", label: "Titre « Légende »", description: "Affiché sur ton profil", emoji: "🏅", amountCts: 300, itemSku: "title_legend" },

  // ── Style : couleurs de pseudo ──
  { sku: "name_red", kind: "unlock", category: "style", label: "Pseudo rouge", description: "Ton pseudo en rouge", emoji: "🟥", amountCts: 200, itemSku: "name_red" },
  { sku: "name_blue", kind: "unlock", category: "style", label: "Pseudo bleu", description: "Ton pseudo en bleu", emoji: "🟦", amountCts: 200, itemSku: "name_blue" },
  { sku: "name_green", kind: "unlock", category: "style", label: "Pseudo vert", description: "Ton pseudo en vert", emoji: "🟩", amountCts: 200, itemSku: "name_green" },
  { sku: "name_cyan", kind: "unlock", category: "style", label: "Pseudo cyan", description: "Ton pseudo en cyan", emoji: "🐬", amountCts: 200, itemSku: "name_cyan" },
  { sku: "name_purple", kind: "unlock", category: "style", label: "Pseudo violet", description: "Ton pseudo en violet", emoji: "🟪", amountCts: 250, itemSku: "name_purple" },
  { sku: "name_gold", kind: "unlock", category: "style", label: "Pseudo or", description: "Ton pseudo doré", emoji: "🥇", amountCts: 300, itemSku: "name_gold" },
  { sku: "name_rainbow", kind: "unlock", category: "style", label: "Pseudo arc-en-ciel", description: "Ton pseudo animé multicolore", emoji: "🌈", amountCts: 500, itemSku: "name_rainbow" },

  // ── Packs combinés ──
  {
    sku: "bundle_starter", kind: "bundle", category: "packs", label: "Pack Débutant",
    description: "60 pixels + 3 bombes + 1 bouclier", emoji: "🎒", amountCts: 500,
    grants: { credits: 60, items: { bomb: 3, shield: 1 } },
  },
  {
    sku: "bundle_pro", kind: "bundle", category: "packs", label: "Pack Pro",
    description: "220 px + 8 bombes + 2 méga + 3 boucliers + 2 dorés + 1 pot", emoji: "🧰", amountCts: 1500,
    grants: { credits: 220, items: { bomb: 8, mega_bomb: 2, shield: 3, golden: 2, bucket: 1 } }, highlight: true,
  },
  {
    sku: "bundle_ultimate", kind: "bundle", category: "packs", label: "Pack Ultime",
    description: "1100 px + 20 bombes + 5 méga + 2 nucléaires + 8 boucliers + 5 dorés + 2 arc-en-ciel + 1 diamant", emoji: "🏰", amountCts: 5000,
    grants: { credits: 1100, items: { bomb: 20, mega_bomb: 5, nuke: 2, shield: 8, golden: 5, rainbow: 2, diamond: 1 } },
  },

  // ── Boîtes mystère ──
  { sku: "mystery_1", kind: "mystery", category: "mystere", label: "Boîte mystère ×1", description: "Contenu surprise : pixels, bombes, effets rares…", emoji: "🎁", amountCts: 150 },
  { sku: "mystery_5", kind: "mystery", category: "mystere", label: "Boîte mystère ×5", description: "5 surprises · -20%", emoji: "🎁", amountCts: 600 },
];

export function getProduct(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

// Libellés des items d'inventaire (consommables + déblocages)
export const ITEM_LABELS: Record<string, { label: string; emoji: string }> = {
  bomb: { label: "Bombe", emoji: "💣" },
  mega_bomb: { label: "Méga-bombe", emoji: "💥" },
  nuke: { label: "Bombe nucléaire", emoji: "☢️" },
  shield: { label: "Bouclier", emoji: "🛡️" },
  golden: { label: "Pixel doré", emoji: "⭐" },
  rainbow: { label: "Pixel arc-en-ciel", emoji: "🌈" },
  diamond: { label: "Pixel diamant", emoji: "💎" },
  bucket: { label: "Pot de peinture", emoji: "🪣" },
  swap: { label: "Recolorateur", emoji: "🎭" },
  mover: { label: "Déplaceur", emoji: "✈️" },
  eraser: { label: "Gomme", emoji: "🧽" },
  badge_star: { label: "Badge Étoile", emoji: "🌟" },
  badge_heart: { label: "Badge Cœur", emoji: "❤️" },
  badge_fire: { label: "Badge Flamme", emoji: "🔥" },
  badge_skull: { label: "Badge Crâne", emoji: "💀" },
  badge_ghost: { label: "Badge Fantôme", emoji: "👻" },
  badge_rocket: { label: "Badge Fusée", emoji: "🚀" },
  badge_diamond: { label: "Badge Diamant", emoji: "💎" },
  badge_crown: { label: "Badge Couronne", emoji: "👑" },
  title_pioneer: { label: "Pionnier", emoji: "🧭" },
  title_artist: { label: "Artiste", emoji: "🎨" },
  title_warlord: { label: "Seigneur de guerre", emoji: "⚔️" },
  title_collector: { label: "Collectionneur", emoji: "🗃️" },
  title_phantom: { label: "Fantôme", emoji: "🌫️" },
  title_legend: { label: "Légende", emoji: "🏅" },
  name_red: { label: "Pseudo rouge", emoji: "🟥" },
  name_blue: { label: "Pseudo bleu", emoji: "🟦" },
  name_green: { label: "Pseudo vert", emoji: "🟩" },
  name_cyan: { label: "Pseudo cyan", emoji: "🐬" },
  name_purple: { label: "Pseudo violet", emoji: "🟪" },
  name_gold: { label: "Pseudo or", emoji: "🥇" },
  name_rainbow: { label: "Pseudo arc-en-ciel", emoji: "🌈" },
};

export const NAME_COLOR_VALUES: Record<string, string> = {
  name_red: "#ff5c5c",
  name_blue: "#5c9dff",
  name_green: "#34d97b",
  name_cyan: "#37c6ff",
  name_purple: "#b06bff",
  name_gold: "#ffd23e",
  name_rainbow: "rainbow",
};

export const CATEGORY_LABELS: { id: ProductCategory; label: string; emoji: string }[] = [
  { id: "pixels", label: "Pixels", emoji: "🎨" },
  { id: "armes", label: "Armes", emoji: "💣" },
  { id: "defense", label: "Défense", emoji: "🛡️" },
  { id: "effets", label: "Effets", emoji: "🌈" },
  { id: "outils", label: "Outils", emoji: "🪣" },
  { id: "style", label: "Style", emoji: "👑" },
  { id: "packs", label: "Packs", emoji: "🧰" },
  { id: "mystere", label: "Mystère", emoji: "🎁" },
];

// Table de butin des boîtes mystère (tirage côté serveur, dans le webhook)
export const MYSTERY_LOOT: { weight: number; credits?: number; items?: Record<string, number>; label: string }[] = [
  { weight: 30, credits: 15, label: "15 pixels" },
  { weight: 20, credits: 30, label: "30 pixels" },
  { weight: 15, items: { bomb: 3 }, label: "3 bombes" },
  { weight: 10, items: { shield: 2 }, label: "2 boucliers" },
  { weight: 8, items: { golden: 2 }, label: "2 pixels dorés" },
  { weight: 7, items: { bucket: 2 }, label: "2 pots de peinture" },
  { weight: 5, items: { mega_bomb: 1 }, label: "1 méga-bombe" },
  { weight: 3, items: { rainbow: 1 }, label: "1 pixel arc-en-ciel" },
  { weight: 2, items: { diamond: 1 }, label: "1 pixel diamant" },
];

export function rollMystery(): { credits: number; items: Record<string, number>; label: string } {
  const total = MYSTERY_LOOT.reduce((s, l) => s + l.weight, 0);
  let r = Math.random() * total;
  for (const loot of MYSTERY_LOOT) {
    r -= loot.weight;
    if (r <= 0) return { credits: loot.credits ?? 0, items: loot.items ?? {}, label: loot.label };
  }
  const last = MYSTERY_LOOT[0];
  return { credits: last.credits ?? 0, items: last.items ?? {}, label: last.label };
}
