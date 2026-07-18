"use client";

// Décor de fond : ciel brumeux, montagnes en couches, forêt de sapins et
// sol de cailloux. 100 % SVG déterministe (aucun aléatoire → pas de
// désynchronisation serveur/client à l'hydratation).

// Pseudo-aléatoire déterministe : uniquement des opérations entières, donc
// bit-à-bit identique côté serveur et côté navigateur (Math.sin ne l'est pas,
// ce qui provoquait une erreur d'hydratation React).
function rnd(i: number, seed = 1): number {
  let t = (i * 374761393 + seed * 668265263) | 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177) | 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

// Arrondi court : le HTML servi et celui recalculé sont strictement identiques.
const r2 = (v: number) => Math.round(v * 100) / 100;

function Trees({
  count,
  color,
  baseY,
  minH,
  maxH,
  seed,
  opacity = 1,
}: {
  count: number;
  color: string;
  baseY: number;
  minH: number;
  maxH: number;
  seed: number;
  opacity?: number;
}) {
  const trees = [];
  for (let i = 0; i < count; i++) {
    const x = r2((i / count) * 1500 - 20 + rnd(i, seed) * 22);
    const h = r2(minH + rnd(i, seed + 5) * (maxH - minH));
    const w = r2(h * 0.42);
    // Sapin : trois étages de branches.
    trees.push(
      <path
        key={i}
        d={
          `M${x} ${baseY} L${r2(x - w / 2)} ${baseY}` +
          ` L${x} ${r2(baseY - h * 0.42)}` +
          ` L${r2(x - w * 0.42)} ${r2(baseY - h * 0.38)}` +
          ` L${x} ${r2(baseY - h * 0.72)}` +
          ` L${r2(x - w * 0.3)} ${r2(baseY - h * 0.68)}` +
          ` L${x} ${r2(baseY - h)}` +
          ` L${r2(x + w * 0.3)} ${r2(baseY - h * 0.68)}` +
          ` L${r2(x + w * 0.42)} ${r2(baseY - h * 0.38)}` +
          ` L${r2(x + w / 2)} ${baseY} Z`
        }
        fill={color}
      />,
    );
  }
  return <g opacity={opacity}>{trees}</g>;
}

function Pebbles({ seed }: { seed: number }) {
  const stones = [];
  const tones = ["#b3aca0", "#9e968a", "#c7c1b6", "#756c61", "#d9d4ca", "#8a8175"];
  for (let i = 0; i < 46; i++) {
    const x = r2(rnd(i, seed) * 1440);
    const y = r2(300 + rnd(i, seed + 3) * 90);
    const r = r2(4 + rnd(i, seed + 7) * 13);
    stones.push(
      <g key={i}>
        <ellipse cx={x} cy={y} rx={r} ry={r2(r * 0.68)} fill={tones[i % tones.length]} />
        <ellipse
          cx={r2(x - r * 0.25)}
          cy={r2(y - r * 0.22)}
          rx={r2(r * 0.35)}
          ry={r2(r * 0.2)}
          fill="#ffffff"
          opacity="0.3"
        />
      </g>,
    );
  }
  return <>{stones}</>;
}

export default function ForestScene() {
  return (
    <div className="pd-scene" aria-hidden>
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          <linearGradient id="pdSkyG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dcebe4" />
            <stop offset="0.55" stopColor="#eaf2ea" />
            <stop offset="1" stopColor="#f2f5ee" />
          </linearGradient>
          <linearGradient id="pdMtFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9db8b2" />
            <stop offset="1" stopColor="#bcd0c8" />
          </linearGradient>
          <linearGradient id="pdMtMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6e8f80" />
            <stop offset="1" stopColor="#8fa997" />
          </linearGradient>
          <linearGradient id="pdGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cfcabc" />
            <stop offset="1" stopColor="#e3ded2" />
          </linearGradient>
          <linearGradient id="pdMistG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2f5ee" stopOpacity="0" />
            <stop offset="1" stopColor="#f2f5ee" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Ciel */}
        <rect width="1440" height="900" fill="url(#pdSkyG)" />

        {/* Soleil voilé */}
        <circle cx="1140" cy="130" r="62" fill="#ffffff" opacity="0.55" />
        <circle cx="1140" cy="130" r="34" fill="#fff8e3" opacity="0.9" />

        {/* Montagnes lointaines */}
        <path
          d="M-40 330 L140 170 L250 250 L360 130 L520 300 L640 210 L760 330 L900 190 L1040 300 L1180 160 L1330 290 L1480 210 L1480 420 L-40 420 Z"
          fill="url(#pdMtFar)"
        />
        {/* Neige sur les sommets */}
        <path d="M360 130 L400 175 L378 172 L360 186 L342 168 L322 176 Z" fill="#ffffff" opacity="0.75" />
        <path d="M1180 160 L1218 202 L1198 198 L1180 212 L1162 196 L1144 204 Z" fill="#ffffff" opacity="0.75" />

        {/* Montagnes proches */}
        <path
          d="M-40 420 L120 280 L260 380 L420 250 L560 390 L700 300 L860 400 L1000 290 L1160 400 L1300 320 L1480 420 L1480 520 L-40 520 Z"
          fill="url(#pdMtMid)"
        />

        {/* Brume entre montagnes et forêt */}
        <rect x="-40" y="380" width="1520" height="150" fill="url(#pdMistG)" />

        {/* Forêt lointaine */}
        <Trees count={64} color="#5f8069" baseY={480} minH={40} maxH={80} seed={2} opacity={0.6} />
        {/* Forêt intermédiaire */}
        <Trees count={44} color="#41654d" baseY={540} minH={70} maxH={130} seed={9} opacity={0.85} />
        {/* Forêt proche */}
        <Trees count={30} color="#2c4a37" baseY={610} minH={110} maxH={190} seed={17} />

        {/* Sol / clairière de cailloux */}
        <path d="M-40 600 Q400 570 720 596 T1480 588 L1480 900 L-40 900 Z" fill="url(#pdGround)" />
        <Pebbles seed={31} />

        {/* Fondu vers le contenu */}
        <rect x="-40" y="700" width="1520" height="200" fill="url(#pdMistG)" />
      </svg>
    </div>
  );
}
