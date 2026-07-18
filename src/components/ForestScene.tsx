"use client";

// Décor de forêt en volume.
// Techniques utilisées pour donner de la profondeur sans image externe :
//  - perspective atmosphérique (plus c'est loin, plus c'est pâle et bleuté)
//  - faces éclairées / faces à l'ombre sur chaque relief
//  - flou gaussien croissant sur les plans lointains (profondeur de champ)
//  - rayons de soleil volumétriques
//  - rochers avec dégradé sphérique, reflet spéculaire et ombre portée
//
// Générateur pseudo-aléatoire ENTIER : bit-à-bit identique serveur/navigateur
// (Math.sin ne l'est pas → provoquait une erreur d'hydratation React).
function rnd(i: number, seed = 1): number {
  let t = (i * 374761393 + seed * 668265263) | 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177) | 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Rangée de sapins, avec ombre d'un côté pour le relief. */
function Trees({
  count, baseY, minH, maxH, seed, lit, dark, opacity = 1,
}: {
  count: number; baseY: number; minH: number; maxH: number;
  seed: number; lit: string; dark: string; opacity?: number;
}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = r2((i / count) * 1700 - 50 + rnd(i, seed) * 26);
    const h = r2(minH + rnd(i, seed + 5) * (maxH - minH));
    const w = r2(h * 0.4);
    const tip = r2(baseY - h);
    // moitié éclairée (gauche) / moitié à l'ombre (droite)
    out.push(
      <g key={i}>
        <path
          d={`M${x} ${tip} L${r2(x - w / 2)} ${baseY} L${x} ${baseY} Z`}
          fill={lit}
        />
        <path
          d={`M${x} ${tip} L${r2(x + w / 2)} ${baseY} L${x} ${baseY} Z`}
          fill={dark}
        />
      </g>,
    );
  }
  return <g opacity={opacity}>{out}</g>;
}

/** Caillou en volume : dégradé sphérique + reflet + ombre portée. */
function Boulder({
  cx, cy, r, tone, shade, i,
}: {
  cx: number; cy: number; r: number; tone: string; shade: string; i: number;
}) {
  const ry = r2(r * 0.72);
  return (
    <g key={i}>
      {/* ombre portée au sol (deux ellipses superposées = dégradé d'ombre
          sans filtre de flou : bien plus léger à rendre, surtout sur mobile) */}
      <ellipse
        cx={r2(cx + r * 0.3)} cy={r2(cy + ry * 0.74)}
        rx={r2(r * 1.15)} ry={r2(ry * 0.42)}
        fill="#5b5340" opacity="0.13"
      />
      <ellipse
        cx={r2(cx + r * 0.26)} cy={r2(cy + ry * 0.7)}
        rx={r2(r * 0.86)} ry={r2(ry * 0.3)}
        fill="#4a4335" opacity="0.22"
      />
      {/* corps */}
      <ellipse cx={cx} cy={cy} rx={r} ry={ry} fill={tone} />
      {/* face à l'ombre (bas-droite) */}
      <path
        d={`M${r2(cx - r)} ${cy} A ${r} ${ry} 0 0 0 ${r2(cx + r)} ${cy}
            A ${r2(r * 0.9)} ${r2(ry * 0.8)} 0 0 1 ${r2(cx - r)} ${cy} Z`}
        fill={shade} opacity="0.55"
      />
      {/* reflet spéculaire (haut-gauche) */}
      <ellipse
        cx={r2(cx - r * 0.3)} cy={r2(cy - ry * 0.38)}
        rx={r2(r * 0.34)} ry={r2(ry * 0.26)}
        fill="#ffffff" opacity="0.42"
      />
    </g>
  );
}

export default function ForestScene() {
  // Rochers du premier plan (flous = proches de l'œil)
  const near = Array.from({ length: 9 }, (_, i) => ({
    cx: r2(rnd(i, 41) * 1700 - 40),
    cy: r2(880 + rnd(i, 42) * 90),
    r: r2(34 + rnd(i, 43) * 54),
    tone: ["#b9b0a0", "#a79d8c", "#c9c1b1", "#8f877a"][i % 4],
    shade: "#4f483d",
  }));
  // Cailloux du sol (nets)
  const mid = Array.from({ length: 34 }, (_, i) => ({
    cx: r2(rnd(i, 61) * 1700 - 30),
    cy: r2(740 + rnd(i, 62) * 120),
    r: r2(7 + rnd(i, 63) * 20),
    tone: ["#d9d4ca", "#c7c1b6", "#b3aca0", "#9e968a", "#e8e4dc"][i % 5],
    shade: "#5c5548",
  }));

  return (
    <div className="pd-scene" aria-hidden>
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          {/* Ciel : lumière chaude en haut à droite (position du soleil) */}
          <linearGradient id="pdSky" x1="0.1" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#9fc4d6" />
            <stop offset="0.42" stopColor="#cfe0dd" />
            <stop offset="0.72" stopColor="#eaeee2" />
            <stop offset="1" stopColor="#f6f2e6" />
          </linearGradient>

          <radialGradient id="pdSun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fffdf2" stopOpacity="1" />
            <stop offset="0.35" stopColor="#ffeec2" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffe6b0" stopOpacity="0" />
          </radialGradient>

          {/* Montagnes : face éclairée / face à l'ombre, de plus en plus pâles au loin */}
          <linearGradient id="pdFarLit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9cfd4" /><stop offset="1" stopColor="#cddedd" />
          </linearGradient>
          <linearGradient id="pdFarShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9db6c0" /><stop offset="1" stopColor="#b7cbcd" />
          </linearGradient>
          <linearGradient id="pdMidLit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fae9d" /><stop offset="1" stopColor="#a8c1ac" />
          </linearGradient>
          <linearGradient id="pdMidShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5f8074" /><stop offset="1" stopColor="#7b9a88" />
          </linearGradient>
          <linearGradient id="pdNearLit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5c7f5f" /><stop offset="1" stopColor="#71926d" />
          </linearGradient>
          <linearGradient id="pdNearShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#33513f" /><stop offset="1" stopColor="#456349" />
          </linearGradient>

          {/* Sol : perspective (plus clair au loin, plus chaud devant) */}
          <linearGradient id="pdGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c8c6ae" />
            <stop offset="0.35" stopColor="#d5cfb8" />
            <stop offset="1" stopColor="#b9ae95" />
          </linearGradient>

          {/* Voile atmosphérique */}
          <linearGradient id="pdHaze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef3ec" stopOpacity="0" />
            <stop offset="1" stopColor="#eef3ec" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id="pdVignette" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#5c5442" stopOpacity="0.34" />
            <stop offset="1" stopColor="#5c5442" stopOpacity="0" />
          </linearGradient>

          {/* Un SEUL flou dans toute la scène (profondeur de champ du premier
              plan). Les autres effets sont obtenus par dégradés, bien moins
              coûteux à rendre — important pour la fluidité sur téléphone. */}
          <filter id="pdDof" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="7" />
          </filter>

          {/* Rayons de soleil : dégradé qui s'estompe, sans flou */}
          <linearGradient id="pdRayG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff6da" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff6da" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── CIEL ── */}
        <rect width="1600" height="1000" fill="url(#pdSky)" />

        {/* ── SOLEIL + rayons volumétriques ── */}
        <g style={{ mixBlendMode: "screen" }} opacity="0.75">
          <polygon points="1245,120 1600,540 1380,600" fill="url(#pdRayG)" />
          <polygon points="1245,120 1520,700 1330,700" fill="url(#pdRayG)" />
          <polygon points="1245,120 1180,700 1050,660" fill="url(#pdRayG)" />
          <polygon points="1245,120 960,620 880,540" fill="url(#pdRayG)" />
        </g>
        <circle cx="1245" cy="120" r="190" fill="url(#pdSun)" />
        <circle cx="1245" cy="120" r="52" fill="#fffdf4" opacity="0.95" />

        {/* ── MONTAGNES LOINTAINES (pâles + floues) ── */}
        <g opacity="0.8">
          <path d="M-60 470 L170 250 L330 400 L470 210 L640 470 Z" fill="url(#pdFarLit)" />
          <path d="M470 210 L640 470 L560 470 Z" fill="url(#pdFarShade)" />
          <path d="M560 460 L760 240 L900 420 L1040 260 L1230 470 Z" fill="url(#pdFarLit)" />
          <path d="M1040 260 L1230 470 L1140 470 Z" fill="url(#pdFarShade)" />
          <path d="M1120 470 L1300 280 L1460 430 L1560 330 L1680 470 Z" fill="url(#pdFarLit)" />
          {/* neige */}
          <path d="M470 210 L515 268 L492 262 L470 282 L446 258 L424 268 Z" fill="#ffffff" opacity="0.9" />
          <path d="M1040 260 L1082 314 L1060 308 L1040 326 L1018 304 L998 312 Z" fill="#ffffff" opacity="0.85" />
          <path d="M170 250 L210 302 L190 296 L170 314 L150 292 L130 300 Z" fill="#ffffff" opacity="0.8" />
        </g>
        <rect x="-60" y="360" width="1720" height="180" fill="url(#pdHaze)" />

        {/* ── MONTAGNES INTERMÉDIAIRES ── */}
        <g opacity="0.96">
          <path d="M-60 610 L140 400 L320 560 L500 380 L700 610 Z" fill="url(#pdMidLit)" />
          <path d="M500 380 L700 610 L590 610 Z" fill="url(#pdMidShade)" />
          <path d="M600 610 L820 420 L980 570 L1160 410 L1380 610 Z" fill="url(#pdMidLit)" />
          <path d="M1160 410 L1380 610 L1255 610 Z" fill="url(#pdMidShade)" />
          <path d="M1250 610 L1440 450 L1680 610 Z" fill="url(#pdMidLit)" />
        </g>
        <rect x="-60" y="520" width="1720" height="150" fill="url(#pdHaze)" opacity="0.75" />

        {/* ── FORÊTS, du lointain au proche ── */}
        <Trees count={78} baseY={648} minH={34} maxH={62} seed={2} lit="#7d9a86" dark="#6a8874" opacity={0.62} />
        <Trees count={58} baseY={706} minH={54} maxH={104} seed={9} lit="#5f8468" dark="#456850" opacity={0.85} />
        <Trees count={40} baseY={772} minH={92} maxH={168} seed={17} lit="url(#pdNearLit)" dark="url(#pdNearShade)" />

        {/* ── SOL ── */}
        <path d="M-60 760 Q420 726 820 754 T1680 742 L1680 1000 L-60 1000 Z" fill="url(#pdGround)" />
        {/* sentier suggéré */}
        <path
          d="M300 1000 Q560 880 700 790 Q760 762 900 754"
          stroke="#cfc7ae" strokeWidth="86" fill="none" opacity="0.28" strokeLinecap="round"
        />
        <path
          d="M300 1000 Q560 880 700 790 Q760 762 900 754"
          stroke="#d8d1ba" strokeWidth="52" fill="none" opacity="0.35" strokeLinecap="round"
        />

        {/* cailloux nets */}
        {mid.map((s, i) => (
          <Boulder key={`m${i}`} i={i} cx={s.cx} cy={s.cy} r={s.r} tone={s.tone} shade={s.shade} />
        ))}

        {/* ── PREMIER PLAN flouté (profondeur de champ) ── */}
        <g filter="url(#pdDof)" opacity="0.95">
          {near.map((s, i) => (
            <Boulder key={`n${i}`} i={i} cx={s.cx} cy={s.cy} r={s.r} tone={s.tone} shade={s.shade} />
          ))}
        </g>

        {/* vignette basse pour asseoir l'image */}
        <rect x="-60" y="800" width="1720" height="200" fill="url(#pdVignette)" />
      </svg>
    </div>
  );
}
