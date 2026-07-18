"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import ForestScene from "@/components/ForestScene";

// Décor animé derrière la clairière.
// Le parallaxe est piloté par une ref (pas par un état React) : la carte peut
// bouger à 60 fps sans provoquer le moindre rendu React.
export type BackdropHandle = { setShift: (panX: number, panY: number) => void };

function rnd(i: number, seed: number): number {
  let t = (i * 374761393 + seed * 668265263) | 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177) | 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

const CanvasBackdrop = forwardRef<BackdropHandle>(function CanvasBackdrop(_props, ref) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const nearRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    setShift(panX: number, panY: number) {
      targetRef.current = { x: panX, y: panY };
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const { x, y } = targetRef.current;
        // Plans lointains : très peu de déplacement. Premier plan : davantage.
        // C'est cette différence de vitesse qui crée la profondeur.
        if (sceneRef.current) {
          sceneRef.current.style.transform =
            `translate3d(${(x * 0.018).toFixed(1)}px, ${(y * 0.012).toFixed(1)}px, 0) scale(1.1)`;
        }
        if (nearRef.current) {
          nearRef.current.style.transform =
            `translate3d(${(x * 0.06).toFixed(1)}px, ${(y * 0.03).toFixed(1)}px, 0)`;
        }
      });
    },
  }));

  const motes = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        left: (rnd(i, 1) * 100).toFixed(2),
        size: (3 + rnd(i, 2) * 8).toFixed(1),
        dur: (16 + rnd(i, 3) * 26).toFixed(1),
        delay: (rnd(i, 4) * 24).toFixed(1),
        drift: (-60 + rnd(i, 5) * 120).toFixed(0),
        color:
          rnd(i, 6) > 0.62
            ? "rgba(255, 236, 178, 0.9)"
            : rnd(i, 7) > 0.5
              ? "rgba(205, 232, 199, 0.85)"
              : "rgba(255, 255, 255, 0.8)",
      })),
    [],
  );

  return (
    <div className="pd-backdrop" aria-hidden>
      {/* plan lointain (bouge à peine) */}
      <div className="pd-parallax" ref={sceneRef}>
        <ForestScene />
      </div>

      {/* halo de soleil + brume, plan intermédiaire */}
      <div className="pd-sunglow" />
      <div className="pd-mist pd-mist-1" />
      <div className="pd-mist pd-mist-2" />

      {/* premier plan (bouge le plus) : pollen + herbes floues */}
      <div className="pd-parallax pd-near" ref={nearRef}>
        <div className="pd-motes">
          {motes.map((m, i) => (
            <span
              key={i}
              style={
                {
                  left: `${m.left}%`,
                  width: `${m.size}px`,
                  height: `${m.size}px`,
                  background: m.color,
                  animationDuration: `${m.dur}s`,
                  animationDelay: `${m.delay}s`,
                  ["--drift" as string]: `${m.drift}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default CanvasBackdrop;
