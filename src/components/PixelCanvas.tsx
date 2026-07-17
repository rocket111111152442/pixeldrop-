"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from "@/lib/canvas-config";

// e : 0 = normal, 1 = doré, 2 = arc-en-ciel, 3 = diamant
export type PixelInfo = { c: string; e: number; i: boolean };
export type PixelMap = Map<number, PixelInfo>;

export const keyOf = (x: number, y: number) => y * GRID_WIDTH + x;

export type ViewInfo = { scale: number; panX: number; panY: number; w: number; h: number };
export type Focus = { x: number; y: number; z?: number; k: number };

type View = { scale: number; panX: number; panY: number };

export default function PixelCanvas({
  pixels,
  version,
  previewColor,
  tool,
  selected,
  moveFrom,
  showGrid = true,
  focus,
  onCellAction,
  onTapSelect,
  onLongPress,
  onHoverCell,
  onViewChange,
  onReady,
}: {
  pixels: PixelMap;
  version: number;
  previewColor: string;
  tool: string;
  selected?: { x: number; y: number } | null;
  moveFrom?: { x: number; y: number } | null;
  showGrid?: boolean;
  focus?: Focus | null;
  onCellAction: (x: number, y: number) => void;
  onTapSelect?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onHoverCell?: (cell: { x: number; y: number } | null) => void;
  onViewChange?: (v: ViewInfo) => void;
  onReady?: (el: HTMLCanvasElement) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const effectsRef = useRef<[number, number, number][]>([]);
  const viewRef = useRef<View>({ scale: DEFAULT_ZOOM, panX: 0, panY: 0 });
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastViewSentRef = useRef(0);

  // Pointeurs actifs (souris/tactile) pour drag + pinch.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });
  const pinchRef = useRef<{
    active: boolean;
    d0: number;
    scale0: number;
    worldMidX: number;
    worldMidY: number;
  }>({ active: false, d0: 1, scale0: DEFAULT_ZOOM, worldMidX: 0, worldMidY: 0 });
  const longPressRef = useRef<{ timer: number | null; fired: boolean }>({
    timer: null,
    fired: false,
  });
  const lastTapRef = useRef<{ t: number; x: number; y: number }>({ t: 0, x: 0, y: 0 });

  // Props accessibles depuis les handlers sans ré-abonnement.
  const propsRef = useRef({ tool, previewColor, selected, moveFrom, showGrid });
  propsRef.current = { tool, previewColor, selected, moveFrom, showGrid };
  const cbRef = useRef({ onCellAction, onTapSelect, onLongPress, onHoverCell, onViewChange });
  cbRef.current = { onCellAction, onTapSelect, onLongPress, onHoverCell, onViewChange };

  // ── Calque hors-écran (1 px = 1 cellule) + liste des pixels animés ──
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
    const fx: [number, number, number][] = [];
    pixels.forEach((info, k) => {
      const x = k % GRID_WIDTH;
      const y = Math.floor(k / GRID_WIDTH);
      octx.fillStyle = info.c;
      octx.fillRect(x, y, 1, 1);
      if (info.e > 0) fx.push([x, y, info.e]);
    });
    effectsRef.current = fx;
  }, [pixels]);

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
    const { tool: curTool, previewColor: curColor, selected: sel, moveFrom: mv, showGrid: grid } =
      propsRef.current;
    const now = Date.now();

    // Fond
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0e1424";
    ctx.fillRect(panX, panY, GRID_WIDTH * scale, GRID_HEIGHT * scale);

    // Pixels
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * panX, dpr * panY);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const minCx = Math.max(0, Math.floor((0 - panX) / scale));
    const maxCx = Math.min(GRID_WIDTH - 1, Math.ceil((w - panX) / scale));
    const minCy = Math.max(0, Math.floor((0 - panY) / scale));
    const maxCy = Math.min(GRID_HEIGHT - 1, Math.ceil((h - panY) / scale));

    // Pixels à effet (animés)
    for (const [x, y, e] of effectsRef.current) {
      if (x < minCx || x > maxCx || y < minCy || y > maxCy) continue;
      const sx = panX + x * scale;
      const sy = panY + y * scale;
      if (e === 1) {
        // Doré : pulsation chaude + contour
        const a = 0.45 + 0.35 * Math.sin(now / 260 + x + y);
        ctx.fillStyle = `rgba(255, 211, 77, ${a.toFixed(3)})`;
        ctx.fillRect(sx, sy, scale, scale);
        if (scale >= 5) {
          ctx.strokeStyle = "#ffd34d";
          ctx.lineWidth = Math.max(1, scale * 0.12);
          ctx.strokeRect(sx + 0.5, sy + 0.5, scale - 1, scale - 1);
        }
      } else if (e === 2) {
        // Arc-en-ciel : teinte qui tourne
        const hue = (now / 12 + (x + y) * 9) % 360;
        ctx.fillStyle = `hsl(${hue.toFixed(0)}, 90%, 58%)`;
        ctx.fillRect(sx, sy, scale, scale);
      } else if (e === 3) {
        // Diamant : scintillement froid
        const a = 0.5 + 0.5 * Math.sin(now / 170 + (x * 7 + y * 3));
        ctx.fillStyle = `rgba(190, 235, 255, ${(0.35 + 0.5 * a).toFixed(3)})`;
        ctx.fillRect(sx, sy, scale, scale);
        if (scale >= 6 && a > 0.75) {
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          const d = Math.max(1.5, scale * 0.2);
          ctx.fillRect(sx + scale / 2 - d / 2, sy + scale / 2 - d / 2, d, d);
        }
      }
    }

    // Marqueur "info" (lien/message)
    if (scale >= 8) {
      pixels.forEach((info, k) => {
        if (!info.i) return;
        const x = k % GRID_WIDTH;
        const y = Math.floor(k / GRID_WIDTH);
        if (x < minCx || x > maxCx || y < minCy || y > maxCy) return;
        const sx = panX + x * scale;
        const sy = panY + y * scale;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        const d = Math.max(2, scale * 0.22);
        ctx.fillRect(sx + scale - d - 1, sy + 1, d, d);
      });
    }

    // Bordure du monde
    ctx.strokeStyle = "rgba(120,140,200,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(panX, panY, GRID_WIDTH * scale, GRID_HEIGHT * scale);

    // Quadrillage
    if (grid && scale >= 12) {
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

    // Zone d'outil (survol souris)
    const drawZone = (cx: number, cy: number, r: number, fill: string) => {
      ctx.fillStyle = fill;
      ctx.fillRect(
        panX + (cx - r) * scale,
        panY + (cy - r) * scale,
        scale * (2 * r + 1),
        scale * (2 * r + 1),
      );
    };
    const hov = hoverRef.current;
    if (hov) {
      if (curTool === "place") {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = curColor;
        ctx.fillRect(panX + hov.x * scale, panY + hov.y * scale, scale, scale);
        ctx.globalAlpha = 1;
      } else if (curTool === "bomb") drawZone(hov.x, hov.y, 0, "rgba(255,80,80,0.4)");
      else if (curTool === "megabomb") drawZone(hov.x, hov.y, 1, "rgba(255,80,80,0.35)");
      else if (curTool === "nuke") drawZone(hov.x, hov.y, 2, "rgba(255,120,40,0.35)");
      else if (curTool === "bucket") drawZone(hov.x, hov.y, 1, "rgba(80,160,255,0.3)");
      else if (curTool === "erase") drawZone(hov.x, hov.y, 0, "rgba(255,255,255,0.3)");
      else if (curTool === "swap") drawZone(hov.x, hov.y, 0, "rgba(176,107,255,0.4)");
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(panX + hov.x * scale + 1, panY + hov.y * scale + 1, scale - 2, scale - 2);
    }

    // Cellule sélectionnée (mobile) : réticule
    if (sel) {
      const sx = panX + sel.x * scale;
      const sy = panY + sel.y * scale;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(sx - 2, sy - 2, scale + 4, scale + 4);
      ctx.setLineDash([]);
      // Croix de visée
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.moveTo(sx + scale / 2, sy - 10);
      ctx.lineTo(sx + scale / 2, sy - 3);
      ctx.moveTo(sx + scale / 2, sy + scale + 3);
      ctx.lineTo(sx + scale / 2, sy + scale + 10);
      ctx.moveTo(sx - 10, sy + scale / 2);
      ctx.lineTo(sx - 3, sy + scale / 2);
      ctx.moveTo(sx + scale + 3, sy + scale / 2);
      ctx.lineTo(sx + scale + 10, sy + scale / 2);
      ctx.stroke();
    }

    // Pixel en cours de déplacement
    if (mv) {
      const sx = panX + mv.x * scale;
      const sy = panY + mv.y * scale;
      ctx.strokeStyle = "#37c6ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(sx, sy, scale, scale);
      ctx.setLineDash([]);
    }

    // Informe le parent (minimap) — throttlé.
    if (now - lastViewSentRef.current > 150) {
      lastViewSentRef.current = now;
      cbRef.current.onViewChange?.({ scale, panX, panY, w, h });
    }
  }, [pixels]);

  const requestDraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  // Animation continue si des pixels à effet existent.
  useEffect(() => {
    const t = setInterval(() => {
      if (effectsRef.current.length > 0) requestDraw();
    }, 120);
    return () => clearInterval(t);
  }, [requestDraw]);

  useEffect(() => {
    rebuildOffscreen();
    requestDraw();
  }, [version, rebuildOffscreen, requestDraw]);

  useEffect(() => {
    requestDraw();
  }, [tool, previewColor, selected, moveFrom, showGrid, requestDraw]);

  // Demande de centrage (deep-link, minimap, boutons zoom).
  useEffect(() => {
    if (!focus) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, focus.z ?? viewRef.current.scale));
    viewRef.current = {
      scale: z,
      panX: rect.width / 2 - (focus.x + 0.5) * z,
      panY: rect.height / 2 - (focus.y + 0.5) * z,
    };
    requestDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.k]);

  // Vue initiale : carte entière visible, centrée.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const fit = Math.max(
      MIN_ZOOM,
      Math.min(rect.width / GRID_WIDTH, rect.height / GRID_HEIGHT) * 0.92,
    );
    const scale = Math.max(fit, MIN_ZOOM);
    viewRef.current = {
      scale,
      panX: rect.width / 2 - (GRID_WIDTH * scale) / 2,
      panY: rect.height / 2 - (GRID_HEIGHT * scale) / 2,
    };
    rebuildOffscreen();
    requestDraw();
    onReady?.(canvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Interactions ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const cellFromClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const { scale, panX, panY } = viewRef.current;
      return {
        x: Math.floor((clientX - rect.left - panX) / scale),
        y: Math.floor((clientY - rect.top - panY) / scale),
        px: clientX - rect.left,
        py: clientY - rect.top,
      };
    };
    const inside = (x: number, y: number) =>
      x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;

    const zoomAt = (px: number, py: number, factor: number) => {
      const v = viewRef.current;
      const worldX = (px - v.panX) / v.scale;
      const worldY = (py - v.panY) / v.scale;
      const ns = clamp(v.scale * factor, MIN_ZOOM, MAX_ZOOM);
      v.scale = ns;
      v.panX = px - worldX * ns;
      v.panY = py - worldY * ns;
      requestDraw();
    };

    const cancelLongPress = () => {
      if (longPressRef.current.timer != null) {
        window.clearTimeout(longPressRef.current.timer);
        longPressRef.current.timer = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size === 2) {
        // Début de pincement
        cancelLongPress();
        dragRef.current.active = false;
        const pts = Array.from(pointersRef.current.values());
        const d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        const rect = canvas.getBoundingClientRect();
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
        const v = viewRef.current;
        pinchRef.current = {
          active: true,
          d0,
          scale0: v.scale,
          worldMidX: (midX - v.panX) / v.scale,
          worldMidY: (midY - v.panY) / v.scale,
        };
        return;
      }

      dragRef.current = {
        active: true,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
      };
      longPressRef.current.fired = false;
      if (e.pointerType === "touch" && cbRef.current.onLongPress) {
        cancelLongPress();
        longPressRef.current.timer = window.setTimeout(() => {
          longPressRef.current.timer = null;
          if (dragRef.current.active && !dragRef.current.moved) {
            longPressRef.current.fired = true;
            const { x, y } = cellFromClient(e.clientX, e.clientY);
            if (inside(x, y)) cbRef.current.onLongPress?.(x, y);
          }
        }, 500);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = pointersRef.current.get(e.pointerId);
      if (p) {
        p.x = e.clientX;
        p.y = e.clientY;
      }

      // Pincement (2 doigts)
      if (pinchRef.current.active && pointersRef.current.size >= 2) {
        const pts = Array.from(pointersRef.current.values());
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        const rect = canvas.getBoundingClientRect();
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
        const pin = pinchRef.current;
        const ns = clamp(pin.scale0 * (d / pin.d0), MIN_ZOOM, MAX_ZOOM);
        const v = viewRef.current;
        v.scale = ns;
        v.panX = midX - pin.worldMidX * ns;
        v.panY = midY - pin.worldMidY * ns;
        requestDraw();
        return;
      }

      const d = dragRef.current;
      if (d.active) {
        const dx = e.clientX - d.lastX;
        const dy = e.clientY - d.lastY;
        if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 6) {
          d.moved = true;
          cancelLongPress();
        }
        if (d.moved) {
          viewRef.current.panX += dx;
          viewRef.current.panY += dy;
          d.lastX = e.clientX;
          d.lastY = e.clientY;
          requestDraw();
        }
      } else if (e.pointerType === "mouse") {
        const { x, y } = cellFromClient(e.clientX, e.clientY);
        const ok = inside(x, y);
        const prev = hoverRef.current;
        if (!ok) {
          if (prev) {
            hoverRef.current = null;
            cbRef.current.onHoverCell?.(null);
            requestDraw();
          }
          return;
        }
        if (!prev || prev.x !== x || prev.y !== y) {
          hoverRef.current = { x, y };
          cbRef.current.onHoverCell?.({ x, y });
          requestDraw();
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (pinchRef.current.active) {
        if (pointersRef.current.size < 2) pinchRef.current.active = false;
        dragRef.current.active = false;
        return;
      }

      const d = dragRef.current;
      d.active = false;
      cancelLongPress();
      if (d.moved || longPressRef.current.fired) return;

      const { x, y, px, py } = cellFromClient(e.clientX, e.clientY);
      if (!inside(x, y)) return;

      if (e.pointerType === "touch") {
        // Double-tap = zoom
        const lt = lastTapRef.current;
        const now = Date.now();
        if (now - lt.t < 300 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30) {
          lastTapRef.current = { t: 0, x: 0, y: 0 };
          zoomAt(px, py, 2);
          return;
        }
        lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };
        // Tap = sélection (réticule) — l'action passe par le bouton flottant.
        if (cbRef.current.onTapSelect) cbRef.current.onTapSelect(x, y);
        else cbRef.current.onCellAction(x, y);
      } else {
        cbRef.current.onCellAction(x, y);
      }
    };

    const onLeave = () => {
      if (hoverRef.current) {
        hoverRef.current = null;
        cbRef.current.onHoverCell?.(null);
        requestDraw();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable))
        return;
      const v = viewRef.current;
      const rect = canvas.getBoundingClientRect();
      const step = 80;
      let used = true;
      if (e.key === "ArrowLeft") v.panX += step;
      else if (e.key === "ArrowRight") v.panX -= step;
      else if (e.key === "ArrowUp") v.panY += step;
      else if (e.key === "ArrowDown") v.panY -= step;
      else if (e.key === "+" || e.key === "=") zoomAt(rect.width / 2, rect.height / 2, 1.25);
      else if (e.key === "-" || e.key === "_") zoomAt(rect.width / 2, rect.height / 2, 1 / 1.25);
      else used = false;
      if (used) {
        e.preventDefault();
        requestDraw();
      }
    };

    const onResize = () => requestDraw();

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [requestDraw]);

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
