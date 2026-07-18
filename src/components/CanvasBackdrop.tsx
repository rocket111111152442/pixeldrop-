"use client";

import { useMemo } from "react";
import ForestScene from "@/components/ForestScene";

// Décor animé derrière la clairière : forêt + brume qui dérive +
// pollen/feuilles qui montent doucement. Purement décoratif.
// Valeurs déterministes → aucun décalage serveur/client à l'hydratation.
function rnd(i: number, seed: number): number {
  let t = (i * 374761393 + seed * 668265263) | 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177) | 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

export default function CanvasBackdrop() {
  const motes = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: (rnd(i, 1) * 100).toFixed(2),
        size: (3 + rnd(i, 2) * 7).toFixed(1),
        dur: (16 + rnd(i, 3) * 26).toFixed(1),
        delay: (rnd(i, 4) * 24).toFixed(1),
        drift: (-60 + rnd(i, 5) * 120).toFixed(0),
        color:
          rnd(i, 6) > 0.62
            ? "rgba(255, 236, 178, 0.85)" // pollen doré
            : rnd(i, 7) > 0.5
              ? "rgba(205, 232, 199, 0.8)" // vert tendre
              : "rgba(255, 255, 255, 0.75)", // poussière lumineuse
      })),
    [],
  );

  return (
    <div className="pd-backdrop" aria-hidden>
      <ForestScene />
      <div className="pd-sunglow" />
      <div className="pd-mist pd-mist-1" />
      <div className="pd-mist pd-mist-2" />
      <div className="pd-motes">
        {motes.map((m, i) => (
          <span
            key={i}
            style={{
              left: `${m.left}%`,
              width: `${m.size}px`,
              height: `${m.size}px`,
              background: m.color,
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`,
              ["--drift" as string]: `${m.drift}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
