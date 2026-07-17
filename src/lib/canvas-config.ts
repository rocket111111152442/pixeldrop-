// Configuration du terrain partagée client + serveur.

export const GRID_WIDTH = 1000;
export const GRID_HEIGHT = 1000;
export const TOTAL_PIXELS = GRID_WIDTH * GRID_HEIGHT; // 1 000 000 cailloux

export const FREE_PIXELS = 10;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 40;
export const DEFAULT_ZOOM = 8;

// ── Palette de cailloux : des teintes minérales, de la plus claire à la plus
// foncée. Calcaire, grès, ardoise, granit, mousse et lichen.
export const PALETTE: string[] = [
  // Calcaire → basalte (gris neutres, clair vers foncé)
  "#f5f3ee", "#e8e4dc", "#d9d4ca", "#c7c1b6", "#b3aca0", "#9e968a",
  "#8a8175", "#756c61", "#615950", "#4d463e", "#3a342e", "#241f1a",
  // Grès (tons chauds, sable → terre)
  "#efe2cd", "#ddc9a9", "#c9ad86", "#b39068", "#96754f", "#7a5c3d",
  // Ardoise (tons froids)
  "#dfe6e8", "#c2ced3", "#a3b3ba", "#84959d", "#67787f", "#4b5a60",
  // Granit rosé
  "#e4d3d0", "#c9a9a3", "#a67f77", "#8a635c",
  // Mousse & lichen
  "#cdd8bf", "#a8bb92", "#7d9268", "#5c7350", "#3f5138",
];

// Teintes utilisées par le décor (forêt / sol).
export const GROUND_COLOR = "#d8d3c7";

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
