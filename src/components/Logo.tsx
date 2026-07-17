import * as React from "react";

// Logo PebbleDrop : un cairn (empilement de cailloux) devant un sapin,
// le repère du randonneur en forêt.

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="PebbleDrop"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="pdSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe3d2" />
          <stop offset="1" stopColor="#7fa886" />
        </linearGradient>
        <linearGradient id="pdStone1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eceae4" />
          <stop offset="1" stopColor="#b3aca0" />
        </linearGradient>
        <linearGradient id="pdStone2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9b2a6" />
          <stop offset="1" stopColor="#756c61" />
        </linearGradient>
        <linearGradient id="pdStone3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a8175" />
          <stop offset="1" stopColor="#4d463e" />
        </linearGradient>
      </defs>

      {/* Ciel / clairière */}
      <rect width="64" height="64" rx="14" fill="url(#pdSky)" />

      {/* Montagne au fond */}
      <path d="M0 44 L18 24 L30 38 L40 28 L64 48 L64 64 L0 64 Z" fill="#5d7f68" opacity="0.55" />

      {/* Sapins */}
      <path d="M12 46 L17 30 L22 46 Z" fill="#33543f" />
      <path d="M46 47 L51 33 L56 47 Z" fill="#33543f" opacity="0.9" />

      {/* Sol */}
      <path d="M0 50 Q32 44 64 50 L64 64 L0 64 Z" fill="#3f5138" />

      {/* Cairn : 3 cailloux empilés */}
      <ellipse cx="32" cy="50" rx="13" ry="6.5" fill="url(#pdStone3)" />
      <ellipse cx="32" cy="41" rx="9.5" ry="5.5" fill="url(#pdStone2)" />
      <ellipse cx="32" cy="33" rx="6" ry="4.2" fill="url(#pdStone1)" />
      {/* Reflet */}
      <ellipse cx="30" cy="31.6" rx="2.4" ry="1.3" fill="#ffffff" opacity="0.65" />
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
          fontSize: Math.round(size * 0.6),
          letterSpacing: -0.5,
          color,
        }}
      >
        PebbleDrop
      </span>
    </span>
  );
}
