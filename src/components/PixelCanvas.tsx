"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from "@/lib/canvas-config";

export type PixelInfo = { c: string; g: boolean; i: boolean };
export type PixelMap = Map<number, PixelInfo>;

export const keyOf = (x: number, y: number) => y * GRID_WIDTH + x;

type View = { scale: number; panX: number; panY: number };

export default function PixelCanvas({
  pixels,
  version,
  previewColor,
  tool,
  onCellAction,
  onHoverCell,
}: {
  pixels: PixelMap;
  version: number;
  previewColor: string;
  tool: "place" | "inspect" | "bomb" | "megabomb";
  onCellAction: (x: number, y: number) => void;
  onHoverCell?: (cell: { x: number; y: number } | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<View>({ scale: DEFAULT_ZOOM, panX: 0, panY: 0 });
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
  }>({ active: false, moved: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });
  const rafRef = useRef<number | null>(null);

  // ── Reconstruit le calque hors-écran (1 px = 1 pixel du monde) ──
  const rebuildOffscreen = useCallback(() => {
    let off = offscreenRef.current;
    if (!off) {
      off = document.createElement("canvas");
      off.width = GRID_WIDTH;
      off.height = GRID_HEIGHT;
      offscreenRef.current = off;
    }
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
    pixels.forEach((info, k) => {
      const x = k % GRID_WIDTH;
      const y = Math.floor(k / GRID_WIDTH);
      octx.fillStyle = info.c;
      octx.fillRect(x, y, 1, 1);
    });
  }, [pixels]);

  const requestDraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    if (!canvas || !off) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const { scale, panX, panY } = viewRef.current;

    // Fond
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0e1424";
    ctx.fillRect(panX, panY, GRID_WIDTH * scale, GRID_HEIGHT * scale);

    // Pixels (transform combiné avec le dpr)
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * panX, dpr * panY);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0);

    // Bordure du monde
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "rgba(120,140,200,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(panX, panY, GRID_WIDTH * scale, GRID_HEIGHT * scale);

    // Visible en cellules
    const minCx = Math.max(0, Math.floor((0 - panX) / scale));
    const maxCx = Math.min(GRID_WIDTH - 1, Math.ceil((w - panX) / scale));
    const minCy = Math.max(0, Math.floor((0 - panY) / scale));
    const maxCy = Math.min(GRID_HEIGHT - 1, Math.ceil((h - panY) / scale));

    // Marqueurs : pixels dorés (contour) + pixels avec lien/texte (point)
    if (scale >= 5) {
      pixels.forEach((info, k) => {
        if (!info.g && !info.i) return;
        const x = k % GRID_WIDTH;
        const y = Math.floor(k / GRID_WIDTH);
        if (x < minCx || x > maxCx || y < minCy || y > maxCy) return;
        const sx = panX + x * scale;
        const sy = panY + y * scale;
        if (info.g) {
          ctx.strokeStyle = "#ffd34d";
          ctx.lineWidth = Math.max(1, scale * 0.15);
          ctx.strokeRect(sx + 0.5, sy + 0.5, scale - 1, scale - 1);
        }
        if (info.i) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          const d = Math.max(2, scale * 0.25);
          ctx.fillRect(sx + scale - d - 1, sy + 1, d, d);
        }
      });
    }

    // Quadrillage quand on est très zoomé
    if (scale >= 12) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let cx = minCx; cx <= maxCx + 1; cx++) {
        const sx = Math.round(panX + cx * scale) + 0.5;
        ctx.moveTo(sx, Math.max(0, panY));
        ctx.lineTo(sx, Math.min(h, panY + GRID_HEIGHT * scale));
      }
      for (let cy = minCy; cy <= maxCy + 1; cy++) {
        const sy = Math.round(panY + cy * scale) + 0.5;
        ctx.moveTo(Math.max(0, panX), sy);
        ctx.lineTo(Math.min(w, panX + GRID_WIDTH * scale), sy);
      }
      ctx.stroke();
    }

    // Cellule survolée + aperçu
    const hov = hoverRef.current;
    if (hov) {
      const sx = panX + hov.x * scale;
      const sy = panY + hov.y * scale;
      if (tool === "place") {
        ctx.fillStyle = previewColor;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(sx, sy, scale, scale);
        ctx.globalAlpha = 1;
      } else if (tool === "bomb" || tool === "megabomb") {
        const r = tool === "megabomb" ? 1 : 0;
        ctx.fillStyle = "rgba(255,80,80,0.35)";
        ctx.fillRect(
          panX + (hov.x - r) * scale,
          panY + (hov.y - r) * scale,
          scale * (2 * r + 1),
          scale * (2 * r + 1),
        );
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, scale - 2, scale - 2);
    }
  }, [pixels, previewColor, tool]);

  // Redessine quand les données/outils changent
  useEffect(() => {
    rebuildOffscreen();
    requestDraw();
  }, [version, rebuildOffscreen, requestDraw]);

  useEffect(() => {
    requestDraw();
  }, [tool, previewColor, requestDraw]);

  // Centre la vue au montage
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = DEFAULT_ZOOM;
    viewRef.current = {
      scale,
      panX: rect.width / 2 - (GRID_WIDTH * scale) / 2,
      panY: rect.height / 2 - (GRID_HEIGHT * scale) / 2,
    };
    rebuildOffscreen();
    requestDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Événements souris/tactile + molette
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const cellFromEvent = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const { scale, panX, panY } = viewRef.current;
      const x = Math.floor((clientX - rect.left - panX) / scale);
      const y = Math.floor((clientY - rect.top - panY) / scale);
      return { x, y };
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const v = viewRef.current;
      const worldX = (mx - v.panX) / v.scale;
      const worldY = (my - v.panY) / v.scale;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newScale = clamp(v.scale * factor, MIN_ZOOM, MAX_ZOOM);
      v.scale = newScale;
      v.panX = mx - worldX * newScale;
      v.panY = my - worldY * newScale;
      requestDraw();
    };

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      dragRef.current = {
        active: true,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d.active) {
        const dx = e.clientX - d.lastX;
        const dy = e.clientY - d.lastY;
        if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 4) {
          d.moved = true;
        }
        if (d.moved) {
          viewRef.current.panX += dx;
          viewRef.current.panY += dy;
          d.lastX = e.clientX;
          d.lastY = e.clientY;
          requestDraw();
        }
      } else {
        const { x, y } = cellFromEvent(e.clientX, e.clientY);
        const inside = x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
        const prev = hoverRef.current;
        if (!inside) {
          if (prev) {
            hoverRef.current = null;
            onHoverCell?.(null);
            requestDraw();
          }
          return;
        }
        if (!prev || prev.x !== x || prev.y !== y) {
          hoverRef.current = { x, y };
          onHoverCell?.({ x, y });
          requestDraw();
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const d = dragRef.current;
      d.active = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!d.moved) {
        const { x, y } = cellFromEvent(e.clientX, e.clientY);
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
          onCellAction(x, y);
        }
      }
    };

    const onLeave = () => {
      if (hoverRef.current) {
        hoverRef.current = null;
        onHoverCell?.(null);
        requestDraw();
      }
    };

    const onResize = () => requestDraw();

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [onCellAction, onHoverCell, requestDraw]);

  return (
    <div className="canvas-wrap">
      <canvas
        ref={canvasRef}
        className="pd-canvas"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
