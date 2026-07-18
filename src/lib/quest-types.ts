// Définitions de quêtes PARTAGÉES client + serveur.
// Aucun import serveur ici (pas de Prisma) : ce fichier part aussi dans le navigateur.

export type GoalType = "place" | "place_color" | "place_area" | "bomb" | "effect";

export const GOAL_TYPES: {
  id: GoalType;
  label: string;
  paramLabel: string | null;
  paramHint?: string;
}[] = [
  { id: "place", label: "Poser des cailloux (tous)", paramLabel: null },
  {
    id: "place_color",
    label: "Poser des cailloux d'une couleur précise",
    paramLabel: "Couleur",
    paramHint: "#3f5138",
  },
  {
    id: "place_area",
    label: "Remplir une zone de la clairière",
    paramLabel: "Zone (x,y,largeur,hauteur)",
    paramHint: "400,400,50,50",
  },
  { id: "bomb", label: "Déloger des cailloux (pioche/masse/dynamite)", paramLabel: null },
  {
    id: "effect",
    label: "Poser des pierres rares",
    paramLabel: "Type (golden / rainbow / diamond, vide = toutes)",
    paramHint: "golden",
  },
];

/** "bomb:2,shield:1" → { bomb: 2, shield: 1 } */
export function parseItems(spec: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of String(spec || "").split(",")) {
    const [sku, qty] = part.split(":").map((s) => s.trim());
    const n = parseInt(qty || "0", 10);
    if (sku && Number.isFinite(n) && n > 0) out[sku] = (out[sku] || 0) + n;
  }
  return out;
}

/** Une zone "x,y,w,h" contient-elle la case ? */
export function inArea(param: string | null, x: number, y: number): boolean {
  if (!param) return false;
  const [ax, ay, aw, ah] = param.split(",").map((s) => parseInt(s.trim(), 10));
  if ([ax, ay, aw, ah].some((v) => !Number.isFinite(v))) return false;
  return x >= ax && x < ax + aw && y >= ay && y < ay + ah;
}
