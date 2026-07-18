// Catalogue des articles achetables via Stripe.
// Prix en centimes d'euro. Prix de base du caillou : 10 cts, dégressif sur les gros sacs.
// ❤️ 100 % des recettes sont reversées aux Restos du Cœur.
//
// ⚠️ Les `sku` et `itemSku` sont stockés en base : ne JAMAIS les renommer
// (seuls les libellés visibles peuvent changer).

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
  credits?: number;
  itemSku?: string;
  itemQty?: number;
  grants?: BundleGrant;
  highlight?: boolean;
};

export const PRODUCTS: Product[] = [
  // ── Sacs de cailloux ──
  { sku: "credits_10", kind: "credits", category: "pixels", label: "10 cailloux", description: "0,10 € / caillou", emoji: "🪨", amountCts: 100, credits: 10 },
  { sku: "credits_25", kind: "credits", category: "pixels", label: "25 cailloux", description: "0,096 € / caillou · -4%", emoji: "🪨", amountCts: 240, credits: 25 },
  { sku: "credits_50", kind: "credits", category: "pixels", label: "50 cailloux", description: "0,09 € / caillou · -10%", emoji: "🧺", amountCts: 450, credits: 50 },
  { sku: "credits_100", kind: "credits", category: "pixels", label: "100 cailloux", description: "0,08 € / caillou · -20%", emoji: "🎒", amountCts: 800, credits: 100, highlight: true },
  { sku: "credits_200", kind: "credits", category: "pixels", label: "200 cailloux", description: "0,075 € / caillou · -25%", emoji: "🛍️", amountCts: 1500, credits: 200 },
  { sku: "credits_500", kind: "credits", category: "pixels", label: "500 cailloux", description: "0,07 € / caillou · -30%", emoji: "🛒", amountCts: 3500, credits: 500 },
  { sku: "credits_1000", kind: "credits", category: "pixels", label: "1000 cailloux", description: "0,06 € / caillou · -40%", emoji: "🛞", amountCts: 6000, credits: 1000 },
  { sku: "credits_2500", kind: "credits", category: "pixels", label: "2500 cailloux", description: "0,055 € / caillou · -45%", emoji: "🚜", amountCts: 13750, credits: 2500 },
  { sku: "credits_5000", kind: "credits", category: "pixels", label: "5000 cailloux", description: "0,05 € / caillou · -50%", emoji: "🏔️", amountCts: 25000, credits: 5000 },
  { sku: "credits_10000", kind: "credits", category: "pixels", label: "10 000 cailloux", description: "0,045 € / caillou · -55%", emoji: "⛰️", amountCts: 45000, credits: 10000 },

  // ── Outils de démolition ──
  { sku: "bomb_1", kind: "item", category: "armes", label: "Pioche ×1", description: "Déloge 1 caillou adverse", emoji: "⛏️", amountCts: 50, itemSku: "bomb", itemQty: 1 },
  { sku: "bomb_5", kind: "item", category: "armes", label: "Pioche ×5", description: "Lot de 5 · -20%", emoji: "⛏️", amountCts: 200, itemSku: "bomb", itemQty: 5, highlight: true },
  { sku: "bomb_10", kind: "item", category: "armes", label: "Pioche ×10", description: "Lot de 10 · -30%", emoji: "⛏️", amountCts: 350, itemSku: "bomb", itemQty: 10 },
  { sku: "bomb_25", kind: "item", category: "armes", label: "Pioche ×25", description: "Lot de 25 · -40%", emoji: "⛏️", amountCts: 750, itemSku: "bomb", itemQty: 25 },
  { sku: "mega_bomb_1", kind: "item", category: "armes", label: "Masse ×1", description: "Déloge une zone 3×3", emoji: "🔨", amountCts: 200, itemSku: "mega_bomb", itemQty: 1 },
  { sku: "mega_bomb_3", kind: "item", category: "armes", label: "Masse ×3", description: "Lot de 3 · -17%", emoji: "🔨", amountCts: 500, itemSku: "mega_bomb", itemQty: 3 },
  { sku: "mega_bomb_10", kind: "item", category: "armes", label: "Masse ×10", description: "Lot de 10 · -25%", emoji: "🔨", amountCts: 1500, itemSku: "mega_bomb", itemQty: 10 },
  { sku: "nuke_1", kind: "item", category: "armes", label: "Dynamite ×1", description: "Fait sauter une zone 5×5 !", emoji: "🧨", amountCts: 500, itemSku: "nuke", itemQty: 1 },
  { sku: "nuke_3", kind: "item", category: "armes", label: "Dynamite ×3", description: "Lot de 3 · -20%", emoji: "🧨", amountCts: 1200, itemSku: "nuke", itemQty: 3 },

  // ── Défense ──
  { sku: "shield_1", kind: "item", category: "defense", label: "Mousse protectrice ×1", description: "Protège 1 caillou de la pioche (pas de la masse)", emoji: "🛡️", amountCts: 100, itemSku: "shield", itemQty: 1 },
  { sku: "shield_5", kind: "item", category: "defense", label: "Mousse protectrice ×5", description: "Lot de 5 · -20%", emoji: "🛡️", amountCts: 400, itemSku: "shield", itemQty: 5 },
  { sku: "shield_10", kind: "item", category: "defense", label: "Mousse protectrice ×10", description: "Lot de 10 · -30%", emoji: "🛡️", amountCts: 700, itemSku: "shield", itemQty: 10 },

  // ── Pierres précieuses (posées sans coûter de caillou) ──
  { sku: "golden_1", kind: "item", category: "effets", label: "Pépite d'or ×1", description: "Caillou doré et brillant", emoji: "⭐", amountCts: 150, itemSku: "golden", itemQty: 1 },
  { sku: "golden_5", kind: "item", category: "effets", label: "Pépite d'or ×5", description: "Lot de 5 · -20%", emoji: "⭐", amountCts: 600, itemSku: "golden", itemQty: 5 },
  { sku: "golden_10", kind: "item", category: "effets", label: "Pépite d'or ×10", description: "Lot de 10 · -33%", emoji: "⭐", amountCts: 1000, itemSku: "golden", itemQty: 10 },
  { sku: "rainbow_1", kind: "item", category: "effets", label: "Opale ×1", description: "Chatoie de mille couleurs", emoji: "🌈", amountCts: 250, itemSku: "rainbow", itemQty: 1 },
  { sku: "rainbow_5", kind: "item", category: "effets", label: "Opale ×5", description: "Lot de 5 · -20%", emoji: "🌈", amountCts: 1000, itemSku: "rainbow", itemQty: 5 },
  { sku: "diamond_1", kind: "item", category: "effets", label: "Diamant brut ×1", description: "Scintille dans la clairière", emoji: "💎", amountCts: 400, itemSku: "diamond", itemQty: 1 },
  { sku: "diamond_5", kind: "item", category: "effets", label: "Diamant brut ×5", description: "Lot de 5 · -20%", emoji: "💎", amountCts: 1600, itemSku: "diamond", itemQty: 5 },

  // ── Outils ──
  { sku: "bucket_1", kind: "item", category: "outils", label: "Seau de gravier ×1", description: "Remplit les cases vides d'une zone 3×3", emoji: "🪣", amountCts: 60, itemSku: "bucket", itemQty: 1 },
  { sku: "bucket_5", kind: "item", category: "outils", label: "Seau de gravier ×5", description: "Lot de 5 · -17%", emoji: "🪣", amountCts: 250, itemSku: "bucket", itemQty: 5 },
  { sku: "swap_1", kind: "item", category: "outils", label: "Polissoir ×1", description: "Change la teinte d'un de TES cailloux", emoji: "🪶", amountCts: 30, itemSku: "swap", itemQty: 1 },
  { sku: "swap_5", kind: "item", category: "outils", label: "Polissoir ×5", description: "Lot de 5 · -20%", emoji: "🪶", amountCts: 120, itemSku: "swap", itemQty: 5 },
  { sku: "swap_10", kind: "item", category: "outils", label: "Polissoir ×10", description: "Lot de 10 · -33%", emoji: "🪶", amountCts: 200, itemSku: "swap", itemQty: 10 },
  { sku: "mover_1", kind: "item", category: "outils", label: "Brouette ×1", description: "Déplace un de TES cailloux", emoji: "🛞", amountCts: 40, itemSku: "mover", itemQty: 1 },
  { sku: "mover_5", kind: "item", category: "outils", label: "Brouette ×5", description: "Lot de 5 · -20%", emoji: "🛞", amountCts: 160, itemSku: "mover", itemQty: 5 },
  { sku: "eraser_1", kind: "item", category: "outils", label: "Râteau ×1", description: "Ramasse un de TES cailloux", emoji: "🍂", amountCts: 20, itemSku: "eraser", itemQty: 1 },
  { sku: "eraser_10", kind: "item", category: "outils", label: "Râteau ×10", description: "Lot de 10 · -25%", emoji: "🍂", amountCts: 150, itemSku: "eraser", itemQty: 10 },

  // ── Style : badges ──
  { sku: "badge_star", kind: "unlock", category: "style", label: "Badge Étoile", description: "🌟 à côté de ton pseudo", emoji: "🌟", amountCts: 100, itemSku: "badge_star" },
  { sku: "badge_heart", kind: "unlock", category: "style", label: "Badge Cœur", description: "❤️ à côté de ton pseudo", emoji: "❤️", amountCts: 100, itemSku: "badge_heart" },
  { sku: "badge_fire", kind: "unlock", category: "style", label: "Badge Feu de camp", description: "🔥 à côté de ton pseudo", emoji: "🔥", amountCts: 150, itemSku: "badge_fire" },
  { sku: "badge_skull", kind: "unlock", category: "style", label: "Badge Crâne", description: "💀 à côté de ton pseudo", emoji: "💀", amountCts: 150, itemSku: "badge_skull" },
  { sku: "badge_ghost", kind: "unlock", category: "style", label: "Badge Esprit des bois", description: "👻 à côté de ton pseudo", emoji: "👻", amountCts: 200, itemSku: "badge_ghost" },
  { sku: "badge_rocket", kind: "unlock", category: "style", label: "Badge Champignon", description: "🍄 à côté de ton pseudo", emoji: "🍄", amountCts: 200, itemSku: "badge_rocket" },
  { sku: "badge_diamond", kind: "unlock", category: "style", label: "Badge Diamant", description: "💎 à côté de ton pseudo", emoji: "💎", amountCts: 250, itemSku: "badge_diamond" },
  { sku: "badge_crown", kind: "unlock", category: "style", label: "Badge Couronne", description: "👑 à côté de ton pseudo", emoji: "👑", amountCts: 300, itemSku: "badge_crown" },

  // ── Style : titres ──
  { sku: "title_pioneer", kind: "unlock", category: "style", label: "Titre « Éclaireur »", description: "Affiché sur ton profil", emoji: "🧭", amountCts: 150, itemSku: "title_pioneer" },
  { sku: "title_artist", kind: "unlock", category: "style", label: "Titre « Tailleur de pierre »", description: "Affiché sur ton profil", emoji: "🗿", amountCts: 150, itemSku: "title_artist" },
  { sku: "title_warlord", kind: "unlock", category: "style", label: "Titre « Briseur de roche »", description: "Affiché sur ton profil", emoji: "⛏️", amountCts: 200, itemSku: "title_warlord" },
  { sku: "title_collector", kind: "unlock", category: "style", label: "Titre « Collectionneur »", description: "Affiché sur ton profil", emoji: "🗃️", amountCts: 200, itemSku: "title_collector" },
  { sku: "title_phantom", kind: "unlock", category: "style", label: "Titre « Esprit des bois »", description: "Affiché sur ton profil", emoji: "🌫️", amountCts: 250, itemSku: "title_phantom" },
  { sku: "title_legend", kind: "unlock", category: "style", label: "Titre « Légende du cairn »", description: "Affiché sur ton profil", emoji: "🏅", amountCts: 300, itemSku: "title_legend" },

  // ── Style : couleurs de pseudo ──
  { sku: "name_red", kind: "unlock", category: "style", label: "Pseudo grès rouge", description: "Ton pseudo en rouge", emoji: "🟥", amountCts: 200, itemSku: "name_red" },
  { sku: "name_blue", kind: "unlock", category: "style", label: "Pseudo ardoise", description: "Ton pseudo en bleu", emoji: "🟦", amountCts: 200, itemSku: "name_blue" },
  { sku: "name_green", kind: "unlock", category: "style", label: "Pseudo mousse", description: "Ton pseudo en vert", emoji: "🟩", amountCts: 200, itemSku: "name_green" },
  { sku: "name_cyan", kind: "unlock", category: "style", label: "Pseudo torrent", description: "Ton pseudo en cyan", emoji: "🐬", amountCts: 200, itemSku: "name_cyan" },
  { sku: "name_purple", kind: "unlock", category: "style", label: "Pseudo améthyste", description: "Ton pseudo en violet", emoji: "🟪", amountCts: 250, itemSku: "name_purple" },
  { sku: "name_gold", kind: "unlock", category: "style", label: "Pseudo doré", description: "Ton pseudo en or", emoji: "🥇", amountCts: 300, itemSku: "name_gold" },
  { sku: "name_rainbow", kind: "unlock", category: "style", label: "Pseudo opale", description: "Ton pseudo animé, chatoyant", emoji: "🌈", amountCts: 500, itemSku: "name_rainbow" },

  // ── Packs combinés ──
  {
    sku: "bundle_starter", kind: "bundle", category: "packs", label: "Sac du Randonneur",
    description: "60 cailloux + 3 pioches + 1 mousse", emoji: "🎒", amountCts: 500,
    grants: { credits: 60, items: { bomb: 3, shield: 1 } },
  },
  {
    sku: "bundle_pro", kind: "bundle", category: "packs", label: "Sac du Carrier",
    description: "220 cailloux + 8 pioches + 2 masses + 3 mousses + 2 pépites + 1 seau", emoji: "🧰", amountCts: 1500,
    grants: { credits: 220, items: { bomb: 8, mega_bomb: 2, shield: 3, golden: 2, bucket: 1 } }, highlight: true,
  },
  {
    sku: "bundle_ultimate", kind: "bundle", category: "packs", label: "Sac du Bâtisseur de cairn",
    description: "1100 cailloux + 20 pioches + 5 masses + 2 dynamites + 8 mousses + 5 pépites + 2 opales + 1 diamant", emoji: "🏔️", amountCts: 5000,
    grants: { credits: 1100, items: { bomb: 20, mega_bomb: 5, nuke: 2, shield: 8, golden: 5, rainbow: 2, diamond: 1 } },
  },

  // ── Sacs surprise ──
  { sku: "mystery_1", kind: "mystery", category: "mystere", label: "Sac surprise ×1", description: "Contenu surprise : cailloux, pioches, pierres rares…", emoji: "🎁", amountCts: 150 },
  { sku: "mystery_5", kind: "mystery", category: "mystere", label: "Sac surprise ×5", description: "5 surprises · -20%", emoji: "🎁", amountCts: 600 },
];

export function getProduct(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

// Libellés des objets d'inventaire (consommables + déblocages)
export const ITEM_LABELS: Record<string, { label: string; emoji: string }> = {
  bomb: { label: "Pioche", emoji: "⛏️" },
  mega_bomb: { label: "Masse", emoji: "🔨" },
  nuke: { label: "Dynamite", emoji: "🧨" },
  shield: { label: "Mousse protectrice", emoji: "🛡️" },
  golden: { label: "Pépite d'or", emoji: "⭐" },
  rainbow: { label: "Opale", emoji: "🌈" },
  diamond: { label: "Diamant brut", emoji: "💎" },
  bucket: { label: "Seau de gravier", emoji: "🪣" },
  swap: { label: "Polissoir", emoji: "🪶" },
  mover: { label: "Brouette", emoji: "🛞" },
  eraser: { label: "Râteau", emoji: "🍂" },
  badge_star: { label: "Badge Étoile", emoji: "🌟" },
  badge_heart: { label: "Badge Cœur", emoji: "❤️" },
  badge_fire: { label: "Badge Feu de camp", emoji: "🔥" },
  badge_skull: { label: "Badge Crâne", emoji: "💀" },
  badge_ghost: { label: "Badge Esprit des bois", emoji: "👻" },
  badge_rocket: { label: "Badge Champignon", emoji: "🍄" },
  badge_diamond: { label: "Badge Diamant", emoji: "💎" },
  badge_crown: { label: "Badge Couronne", emoji: "👑" },
  title_pioneer: { label: "Éclaireur", emoji: "🧭" },
  title_artist: { label: "Tailleur de pierre", emoji: "🗿" },
  title_warlord: { label: "Briseur de roche", emoji: "⛏️" },
  title_collector: { label: "Collectionneur", emoji: "🗃️" },
  title_phantom: { label: "Esprit des bois", emoji: "🌫️" },
  title_legend: { label: "Légende du cairn", emoji: "🏅" },
  name_red: { label: "Pseudo grès rouge", emoji: "🟥" },
  name_blue: { label: "Pseudo ardoise", emoji: "🟦" },
  name_green: { label: "Pseudo mousse", emoji: "🟩" },
  name_cyan: { label: "Pseudo torrent", emoji: "🐬" },
  name_purple: { label: "Pseudo améthyste", emoji: "🟪" },
  name_gold: { label: "Pseudo doré", emoji: "🥇" },
  name_rainbow: { label: "Pseudo opale", emoji: "🌈" },
};

export const NAME_COLOR_VALUES: Record<string, string> = {
  name_red: "#b5563f",
  name_blue: "#4b6b86",
  name_green: "#3f7d4e",
  name_cyan: "#3d8b92",
  name_purple: "#7a5c8f",
  name_gold: "#b08a2e",
  name_rainbow: "rainbow",
};

export const CATEGORY_LABELS: { id: ProductCategory; label: string; emoji: string }[] = [
  { id: "pixels", label: "Cailloux", emoji: "🪨" },
  { id: "armes", label: "Démolition", emoji: "⛏️" },
  { id: "defense", label: "Défense", emoji: "🛡️" },
  { id: "effets", label: "Pierres rares", emoji: "💎" },
  { id: "outils", label: "Outils", emoji: "🪣" },
  { id: "style", label: "Style", emoji: "👑" },
  { id: "packs", label: "Sacs", emoji: "🧰" },
  { id: "mystere", label: "Surprise", emoji: "🎁" },
];

// Table de butin des sacs surprise (tirage côté serveur, dans le webhook)
export const MYSTERY_LOOT: { weight: number; credits?: number; items?: Record<string, number>; label: string }[] = [
  { weight: 30, credits: 15, label: "15 cailloux" },
  { weight: 20, credits: 30, label: "30 cailloux" },
  { weight: 15, items: { bomb: 3 }, label: "3 pioches" },
  { weight: 10, items: { shield: 2 }, label: "2 mousses protectrices" },
  { weight: 8, items: { golden: 2 }, label: "2 pépites d'or" },
  { weight: 7, items: { bucket: 2 }, label: "2 seaux de gravier" },
  { weight: 5, items: { mega_bomb: 1 }, label: "1 masse" },
  { weight: 3, items: { rainbow: 1 }, label: "1 opale" },
  { weight: 2, items: { diamond: 1 }, label: "1 diamant brut" },
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
