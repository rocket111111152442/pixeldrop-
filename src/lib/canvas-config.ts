// Configuration du canvas partagée client + serveur.

export const GRID_WIDTH = 1000;
export const GRID_HEIGHT = 1000;
export const TOTAL_PIXELS = GRID_WIDTH * GRID_HEIGHT; // 1 000 000

export const FREE_PIXELS = 10;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 40;
export const DEFAULT_ZOOM = 8;

// Palette de couleurs par défaut (large). L'utilisateur peut aussi
// choisir n'importe quelle couleur via le sélecteur "custom".
export const PALETTE: string[] = [
  "#000000", "#3c3c3c", "#787878", "#aaaaaa", "#d2d2d2", "#ffffff",
  "#600018", "#a50e1e", "#ed1c24", "#fa8072", "#e45c1a", "#ff7f27",
  "#f6aa09", "#f9dd3b", "#fffabc", "#9c8431", "#c5ad31", "#e8d45f",
  "#4a6b3a", "#5a944a", "#84c573", "#0eb968", "#13e67b", "#87ff5e",
  "#0c816e", "#10aea6", "#13e1be", "#0f799f", "#60f7f2", "#bbfaf2",
  "#28509e", "#4093e4", "#7dc7ff", "#4d31b8", "#6b50f6", "#99b1fb",
  "#780c99", "#aa38b9", "#e09ff9", "#cb007a", "#ec1f80", "#f38da9",
  "#684634", "#95682a", "#dba463", "#7b6352", "#9c846a", "#d6b594",
  "#d18051", "#f8b277", "#ffc5a5", "#6d482f", "#9b5249", "#d18078",
];

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function isInsideGrid(x: number, y: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x < GRID_WIDTH &&
    y >= 0 &&
    y < GRID_HEIGHT
  );
}
