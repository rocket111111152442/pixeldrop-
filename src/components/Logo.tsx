import * as React from "react";

// Logo PixelDrop : une goutte faite de pixels (pixel + « drop »),
// aux couleurs de la marque, avec quelques pixels colorés en clin d'œil au canvas.

// Cellules de la goutte : [colonne, ligne, couleur?]  (défaut = blanc)
const CELLS: [number, number, string?][] = [
  [3, 0],
  [3, 1],
  [2, 2], [3, 2], [4, 2],
  [1, 3, "#ff3b57"], [2, 3], [3, 3], [4, 3], [5, 3],
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4, "#ffd23e"],
  [0, 5, "#22e07a"], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6, "#37c6ff"],
  [1, 7], [2, 7], [3, 7], [4, 7, "#b06bff"], [5, 7],
  [2, 8], [3, 8], [4, 8],
];

const OX = 12.75;
const OY = 7.25;
const CELL = 5.5;
const SIZE = 4.8;

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="PixelDrop"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="pdLogoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6b8cff" />
          <stop offset="1" stopColor="#b06bff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#pdLogoGrad)" />
      {CELLS.map(([c, r, fill], i) => (
        <rect
          key={i}
          x={OX + c * CELL}
          y={OY + r * CELL}
          width={SIZE}
          height={SIZE}
          rx="1.1"
          fill={fill || "#ffffff"}
        />
      ))}
    </svg>
  );
}

export function Logo({
  size = 30,
  color = "var(--text)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      <span
        style={{
          fontWeight: 900,
          fontSize: Math.round(size * 0.62),
          letterSpacing: -0.5,
          color,
        }}
      >
        PixelDrop
      </span>
    </span>
  );
}
