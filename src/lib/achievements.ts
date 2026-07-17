// Définitions de progression PARTAGÉES client + serveur (aucune dépendance serveur ici).

export const XP_PLACE = 10;
export const XP_BOMB = 5;
export const XP_CHAT = 1;

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

/** XP total requis pour atteindre le niveau n. */
export function xpForLevel(n: number): number {
  return Math.max(0, (n - 1) * (n - 1) * 100);
}

export const ACHIEVEMENTS: Record<string, { label: string; emoji: string; desc: string }> = {
  first_pixel: { label: "Premier pas", emoji: "👣", desc: "Poser ton premier pixel" },
  pixels_10: { label: "Décollage", emoji: "🛫", desc: "Poser 10 pixels" },
  pixels_100: { label: "Bâtisseur", emoji: "🏗️", desc: "Poser 100 pixels" },
  pixels_1000: { label: "Architecte", emoji: "🏛️", desc: "Poser 1000 pixels" },
  first_link: { label: "Connecté", emoji: "🔗", desc: "Attacher un lien à un pixel" },
  first_text: { label: "Messager", emoji: "💬", desc: "Attacher un message à un pixel" },
  first_effect: { label: "Étincelant", emoji: "✨", desc: "Poser un pixel à effet" },
  corner_stone: { label: "Pierre angulaire", emoji: "📐", desc: "Poser un pixel dans un coin de la carte" },
  dead_center: { label: "Plein centre", emoji: "🎯", desc: "Poser un pixel au centre exact" },
  bomber: { label: "Artificier", emoji: "💣", desc: "Utiliser ta première bombe" },
  landlord: { label: "Propriétaire", emoji: "🏘️", desc: "Posséder 100 pixels en même temps" },
  level_5: { label: "Niveau 5", emoji: "⬆️", desc: "Atteindre le niveau 5" },
  level_10: { label: "Niveau 10", emoji: "🔟", desc: "Atteindre le niveau 10" },
  level_25: { label: "Vétéran", emoji: "🎖️", desc: "Atteindre le niveau 25" },
  streak_3: { label: "Habitué", emoji: "📅", desc: "3 jours de récompense d'affilée" },
  streak_7: { label: "Fidèle", emoji: "🗓️", desc: "7 jours de récompense d'affilée" },
  first_chat: { label: "Bavard", emoji: "🗣️", desc: "Envoyer un message dans le chat" },
  first_buy: { label: "Client", emoji: "🛍️", desc: "Faire un premier achat" },
  big_spender: { label: "Mécène", emoji: "💸", desc: "Dépenser 20 € au total" },
};

/** Succès liés au niveau atteint. */
export function levelAchievements(level: number): string[] {
  const out: string[] = [];
  if (level >= 5) out.push("level_5");
  if (level >= 10) out.push("level_10");
  if (level >= 25) out.push("level_25");
  return out;
}
