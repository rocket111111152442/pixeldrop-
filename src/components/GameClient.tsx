"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import PixelCanvas, {
  keyOf,
  type PixelMap,
  type ViewInfo,
  type Focus,
} from "@/components/PixelCanvas";
import ChatPanel from "@/components/ChatPanel";
import { LogoMark } from "@/components/Logo";
import { PALETTE, GRID_WIDTH, GRID_HEIGHT } from "@/lib/canvas-config";
import { ITEM_LABELS } from "@/lib/products";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { playSound, vibrate, type SoundName } from "@/lib/sounds";

// ─────────────────────────────────────────────────────────────────────────────

type Me = {
  authenticated: boolean;
  id?: string;
  pseudo?: string;
  image?: string | null;
  isAdmin?: boolean;
  banned?: boolean;
  muted?: boolean;
  credits?: number;
  totalPlaced?: number;
  ownedPixels?: number;
  xp?: number;
  level?: number;
  xpNext?: number;
  xpBase?: number;
  achievements?: string[];
  equippedBadge?: string | null;
  nameColor?: string | null;
  dailyStreak?: number;
  dailyClaimable?: boolean;
  inventory?: Record<string, number>;
  unlocks?: string[];
};

type Info = {
  found: boolean;
  x: number;
  y: number;
  color: string;
  link?: string | null;
  text?: string | null;
  effect?: string | null;
  shielded?: boolean;
  owner?: string;
  ownerLevel?: number;
  ownerBadge?: string | null;
  ownerTitle?: string | null;
  ownerColor?: string | null;
  ownerPlaced?: number;
};

type Tool =
  | "place" | "inspect" | "bomb" | "megabomb" | "nuke"
  | "bucket" | "swap" | "move" | "erase" | "pick";

type EffectSel = "" | "golden" | "rainbow" | "diamond";

type Toast = { id: number; msg: string; type: "error" | "success" | "gold" };

type Recent = { x: number; y: number; color: string; pseudo: string; at: string };

const TOOL_META: Record<Tool, { emoji: string; label: string; inv?: string }> = {
  place: { emoji: "🖌️", label: "Poser" },
  inspect: { emoji: "🔍", label: "Infos" },
  bomb: { emoji: "💣", label: "Bombe", inv: "bomb" },
  megabomb: { emoji: "💥", label: "Méga", inv: "mega_bomb" },
  nuke: { emoji: "☢️", label: "Nucléaire", inv: "nuke" },
  bucket: { emoji: "🪣", label: "Pot", inv: "bucket" },
  swap: { emoji: "🎭", label: "Recolore", inv: "swap" },
  move: { emoji: "✈️", label: "Déplace", inv: "mover" },
  erase: { emoji: "🧽", label: "Gomme", inv: "eraser" },
  pick: { emoji: "💉", label: "Pipette" },
};

function lsGet(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GameClient({ guest = false }: { guest?: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  const pixelsRef = useRef<PixelMap>(new Map());
  const [version, setVersion] = useState(0);
  const [count, setCount] = useState(0);
  const [online, setOnline] = useState(0);

  const [color, setColor] = useState("#ed1c24");
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>(guest ? "inspect" : "place");
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [effectSel, setEffectSel] = useState<EffectSel>("");
  const [useShield, setUseShield] = useState(false);
  const [moveFrom, setMoveFrom] = useState<{ x: number; y: number } | null>(null);

  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);

  const [sheetTab, setSheetTab] = useState<"colors" | "tools" | "options" | null>("colors");
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [minimapOn, setMinimapOn] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [vibrOn, setVibrOn] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [announceHidden, setAnnounceHidden] = useState(false);
  const [daily, setDaily] = useState<{ claimable: boolean; reward: number }>({ claimable: false, reward: 0 });
  const [recent, setRecent] = useState<Recent[]>([]);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const viewRef = useRef<ViewInfo | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const focusKeyRef = useRef(1);
  const toastIdRef = useRef(1);

  const isAdmin = !!me?.isAdmin;
  const inv = useMemo(() => me?.inventory || {}, [me]);

  // ── Utilitaires ──
  const bump = () => setVersion((v) => v + 1);

  const sfx = useCallback(
    (name: SoundName) => playSound(name, soundOn),
    [soundOn],
  );
  const buzz = useCallback(
    (pattern: number | number[]) => vibrate(pattern, vibrOn),
    [vibrOn],
  );

  const flash = useCallback((msg: string, type: Toast["type"] = "error") => {
    const id = toastIdRef.current++;
    setToasts((t) => [...t.slice(-3), { id, msg, type }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const celebrate = useCallback(
    (data: { leveledUp?: boolean; level?: number; newAchievements?: string[] }) => {
      if (data.leveledUp && data.level) {
        flash(`⬆️ Niveau ${data.level} !`, "gold");
        sfx("level");
      }
      for (const id of data.newAchievements || []) {
        const a = ACHIEVEMENTS[id];
        if (a) flash(`🏆 Succès : ${a.emoji} ${a.label}`, "gold");
      }
      if (data.newAchievements?.length) sfx("level");
    },
    [flash, sfx],
  );

  const goTo = useCallback((x: number, y: number, z?: number) => {
    setFocus({ x, y, z, k: focusKeyRef.current++ });
  }, []);

  // ── Chargements ──
  const loadMe = useCallback(async () => {
    if (guest) {
      setMe({ authenticated: false });
      return;
    }
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      const data = await r.json();
      setMe(data);
      if (data.authenticated) {
        setDaily((d) => ({ ...d, claimable: !!data.dailyClaimable }));
      }
    } catch {
      setMe({ authenticated: false });
    }
  }, [guest]);

  const loadPixels = useCallback(async () => {
    try {
      const r = await fetch("/api/pixels", { cache: "no-store" });
      const data = await r.json();
      const map: PixelMap = new Map();
      for (const [x, y, c, e, i] of data.p as [number, number, string, number, number][]) {
        map.set(keyOf(x, y), { c, e: e || 0, i: !!i });
      }
      pixelsRef.current = map;
      setCount(map.size);
      bump();
    } catch {
      /* ignore */
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch("/api/stats", { cache: "no-store" });
      const d = await r.json();
      setOnline(d.online ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  const loadAnnounce = useCallback(async () => {
    try {
      const r = await fetch("/api/announce", { cache: "no-store" });
      const d = await r.json();
      setAnnouncement(d.text || "");
      if (d.text && lsGet("pd_ann", "") !== d.text) setAnnounceHidden(false);
    } catch {
      /* ignore */
    }
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const r = await fetch("/api/pixels/recent", { cache: "no-store" });
      const d = await r.json();
      setRecent(d.recent || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadMe();
    loadPixels();
    loadStats();
    loadAnnounce();
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
    setMinimapOn(!window.matchMedia("(max-width: 700px)").matches);
    setShowGrid(lsGet("pd_grid", "1") === "1");
    setSoundOn(lsGet("pd_sound", "1") === "1");
    setVibrOn(lsGet("pd_vibr", "1") === "1");
    try {
      setRecentColors(JSON.parse(lsGet("pd_recent", "[]")));
    } catch {
      /* ignore */
    }
    // Deep-link ?x=&y=&z=
    const p = new URLSearchParams(window.location.search);
    const x = Number(p.get("x"));
    const y = Number(p.get("y"));
    if (Number.isFinite(x) && Number.isFinite(y) && p.get("x") !== null) {
      const z = Number(p.get("z"));
      setTimeout(() => goTo(x, y, Number.isFinite(z) && z > 0 ? z : 16), 120);
    }
  }, [loadMe, loadPixels, loadStats, loadAnnounce, goTo]);

  useEffect(() => {
    const t1 = setInterval(loadPixels, 3000);
    const t2 = setInterval(loadStats, 30_000);
    const t3 = setInterval(loadAnnounce, 60_000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
    };
  }, [loadPixels, loadStats, loadAnnounce]);

  useEffect(() => {
    if (menuOpen) loadRecent();
  }, [menuOpen, loadRecent]);

  // ── Minimap ──
  const drawMinimap = useCallback(() => {
    const mm = minimapRef.current;
    if (!mm) return;
    const ctx = mm.getContext("2d");
    if (!ctx) return;
    const S = 120;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = "#0e1424";
    ctx.fillRect(0, 0, S, S);
    const k = S / GRID_WIDTH;
    pixelsRef.current.forEach((info, key) => {
      const x = key % GRID_WIDTH;
      const y = Math.floor(key / GRID_WIDTH);
      ctx.fillStyle = info.c;
      ctx.fillRect(Math.floor(x * k), Math.floor(y * k), 1, 1);
    });
    const v = viewRef.current;
    if (v) {
      const vx = ((0 - v.panX) / v.scale) * k;
      const vy = ((0 - v.panY) / v.scale) * k;
      const vw = (v.w / v.scale) * k;
      const vh = (v.h / v.scale) * k;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(vx, vy, Math.min(vw, S), Math.min(vh, S));
    }
    ctx.strokeStyle = "rgba(120,140,200,0.8)";
    ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
  }, []);

  useEffect(() => {
    if (minimapOn) drawMinimap();
  }, [version, minimapOn, drawMinimap]);

  const onViewChange = useCallback(
    (v: ViewInfo) => {
      viewRef.current = v;
      if (minimapOn) drawMinimap();
    },
    [minimapOn, drawMinimap],
  );

  const centerOfView = useCallback((): { x: number; y: number; z: number } => {
    const v = viewRef.current;
    if (!v) return { x: 500, y: 500, z: 8 };
    return {
      x: Math.round((v.w / 2 - v.panX) / v.scale),
      y: Math.round((v.h / 2 - v.panY) / v.scale),
      z: v.scale,
    };
  }, []);

  // ── Actions ──
  const rememberColor = useCallback((c: string) => {
    setRecentColors((prev) => {
      const next = [c, ...prev.filter((p) => p !== c)].slice(0, 10);
      lsSet("pd_recent", JSON.stringify(next));
      return next;
    });
  }, []);

  const needAccount = useCallback(() => {
    flash("Crée un compte gratuit pour jouer — 10 cailloux offerts !");
  }, [flash]);

  const applyProgress = useCallback(
    (data: { credits?: number; xp?: number; level?: number; leveledUp?: boolean; newAchievements?: string[] }) => {
      setMe((m) =>
        m
          ? {
              ...m,
              credits: data.credits ?? m.credits,
              xp: data.xp ?? m.xp,
              level: data.level ?? m.level,
            }
          : m,
      );
      celebrate(data);
    },
    [celebrate],
  );

  const doPlace = useCallback(
    async (x: number, y: number) => {
      if (!me?.authenticated) return needAccount();
      if (!isAdmin && pixelsRef.current.has(keyOf(x, y))) {
        flash("Cette case est déjà occupée.");
        sfx("error");
        return;
      }
      setBusy(true);
      try {
        const r = await fetch("/api/pixels/place", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            x, y, color,
            link: link || undefined,
            text: text || undefined,
            effect: effectSel || undefined,
            shield: useShield,
          }),
        });
        const data = await r.json();
        if (!r.ok) {
          flash(data.error || "Impossible de poser ici.");
          sfx("error");
          loadPixels();
          loadMe();
          return;
        }
        const eCode = effectSel === "golden" ? 1 : effectSel === "rainbow" ? 2 : effectSel === "diamond" ? 3 : 0;
        pixelsRef.current.set(keyOf(x, y), { c: color, e: eCode, i: !!(link || text) });
        setCount(pixelsRef.current.size);
        bump();
        rememberColor(color);
        applyProgress(data);
        setEffectSel("");
        setUseShield(false);
        sfx("place");
        buzz(12);
      } finally {
        setBusy(false);
      }
    },
    [me, isAdmin, color, link, text, effectSel, useShield, flash, sfx, buzz, loadPixels, loadMe, rememberColor, applyProgress, needAccount],
  );

  const doBomb = useCallback(
    async (x: number, y: number, kind: "bomb" | "mega" | "nuke") => {
      if (!me?.authenticated) return needAccount();
      setBusy(true);
      try {
        const r = await fetch("/api/pixels/bomb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x, y, kind }),
        });
        const data = await r.json();
        if (!r.ok) {
          flash(data.error || "Échec.");
          sfx("error");
          loadMe();
          return;
        }
        for (const c of data.removed as { x: number; y: number }[]) {
          pixelsRef.current.delete(keyOf(c.x, c.y));
        }
        setCount(pixelsRef.current.size);
        bump();
        loadMe();
        applyProgress(data);
        flash(`💥 ${data.removed.length} caillou(x) délogé(s)`, "success");
        sfx("boom");
        buzz([20, 30, 40]);
      } finally {
        setBusy(false);
      }
    },
    [me, flash, sfx, buzz, loadMe, applyProgress, needAccount],
  );

  const doBucket = useCallback(
    async (x: number, y: number) => {
      if (!me?.authenticated) return needAccount();
      setBusy(true);
      try {
        const r = await fetch("/api/pixels/bucket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x, y, color }),
        });
        const data = await r.json();
        if (!r.ok) {
          flash(data.error || "Échec.");
          sfx("error");
          return;
        }
        for (const c of data.placed as { x: number; y: number }[]) {
          pixelsRef.current.set(keyOf(c.x, c.y), { c: color, e: 0, i: false });
        }
        setCount(pixelsRef.current.size);
        bump();
        loadMe();
        flash(`🪣 ${data.placed.length} caillou(x) posé(s) !`, "success");
        sfx("place");
        buzz(15);
      } finally {
        setBusy(false);
      }
    },
    [me, color, flash, sfx, buzz, loadMe, needAccount],
  );

  const doSwap = useCallback(
    async (x: number, y: number) => {
      if (!me?.authenticated) return needAccount();
      setBusy(true);
      try {
        const r = await fetch("/api/pixels/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x, y, color }),
        });
        const data = await r.json();
        if (!r.ok) {
          flash(data.error || "Échec.");
          sfx("error");
          return;
        }
        const prev = pixelsRef.current.get(keyOf(x, y));
        pixelsRef.current.set(keyOf(x, y), { c: color, e: prev?.e ?? 0, i: prev?.i ?? false });
        bump();
        loadMe();
        flash("🎭 Caillou poli !", "success");
        sfx("place");
      } finally {
        setBusy(false);
      }
    },
    [me, color, flash, sfx, loadMe, needAccount],
  );

  const doErase = useCallback(
    async (x: number, y: number) => {
      if (!me?.authenticated) return needAccount();
      setBusy(true);
      try {
        const r = await fetch("/api/pixels/erase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x, y }),
        });
        const data = await r.json();
        if (!r.ok) {
          flash(data.error || "Échec.");
          sfx("error");
          return;
        }
        pixelsRef.current.delete(keyOf(x, y));
        setCount(pixelsRef.current.size);
        bump();
        loadMe();
        flash("🍂 Caillou ramassé.", "success");
      } finally {
        setBusy(false);
      }
    },
    [me, flash, sfx, loadMe, needAccount],
  );

  const doMove = useCallback(
    async (x: number, y: number) => {
      if (!me?.authenticated) return needAccount();
      if (!moveFrom) {
        if (!pixelsRef.current.has(keyOf(x, y))) {
          flash("Choisis d'abord un de TES cailloux à déplacer.");
          return;
        }
        setMoveFrom({ x, y });
        flash("🛞 Caillou chargé — clique une case vide pour le déposer.", "success");
        return;
      }
      setBusy(true);
      try {
        const r = await fetch("/api/pixels/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromX: moveFrom.x, fromY: moveFrom.y, toX: x, toY: y }),
        });
        const data = await r.json();
        if (!r.ok) {
          flash(data.error || "Échec du déplacement.");
          sfx("error");
          if (r.status !== 409) setMoveFrom(null);
          return;
        }
        const src = pixelsRef.current.get(keyOf(moveFrom.x, moveFrom.y));
        pixelsRef.current.delete(keyOf(moveFrom.x, moveFrom.y));
        pixelsRef.current.set(keyOf(x, y), src ?? { c: data.pixel.color, e: 0, i: false });
        bump();
        setMoveFrom(null);
        loadMe();
        flash("🛞 Caillou déplacé !", "success");
        sfx("place");
      } finally {
        setBusy(false);
      }
    },
    [me, moveFrom, flash, sfx, loadMe, needAccount],
  );

  const doInspect = useCallback(async (x: number, y: number) => {
    try {
      const r = await fetch(`/api/pixels/at?x=${x}&y=${y}`, { cache: "no-store" });
      const data = await r.json();
      setInfo(data.found ? data : { found: false, x, y, color: "" });
    } catch {
      /* ignore */
    }
  }, []);

  const doPick = useCallback(
    (x: number, y: number) => {
      const p = pixelsRef.current.get(keyOf(x, y));
      if (p) {
        setColor(p.c);
        setTool("place");
        flash(`💉 Couleur ${p.c} récupérée`, "success");
        sfx("click");
      } else {
        flash("Case vide — rien à prélever.");
      }
    },
    [flash, sfx],
  );

  const onCellAction = useCallback(
    (x: number, y: number) => {
      if (busy) return;
      if (guest || !me?.authenticated) {
        doInspect(x, y);
        return;
      }
      switch (tool) {
        case "place": return void doPlace(x, y);
        case "inspect": return void doInspect(x, y);
        case "bomb": return void doBomb(x, y, "bomb");
        case "megabomb": return void doBomb(x, y, "mega");
        case "nuke": return void doBomb(x, y, "nuke");
        case "bucket": return void doBucket(x, y);
        case "swap": return void doSwap(x, y);
        case "move": return void doMove(x, y);
        case "erase": return void doErase(x, y);
        case "pick": return void doPick(x, y);
      }
    },
    [busy, guest, me, tool, doPlace, doInspect, doBomb, doBucket, doSwap, doMove, doErase, doPick],
  );

  const claimDaily = useCallback(async () => {
    const r = await fetch("/api/daily", { method: "POST" });
    const d = await r.json();
    if (!r.ok) {
      flash(d.error || "Déjà réclamé.");
      return;
    }
    setDaily({ claimable: false, reward: 0 });
    setMe((m) => (m ? { ...m, credits: d.credits, dailyStreak: d.streak } : m));
    celebrate(d);
    flash(`🎁 +${d.reward} cailloux ! (série : ${d.streak} jour${d.streak > 1 ? "s" : ""})`, "gold");
    sfx("coin");
  }, [flash, celebrate, sfx]);

  const shareLocation = useCallback(async () => {
    const c = centerOfView();
    const url = `${window.location.origin}/?x=${c.x}&y=${c.y}&z=${c.z.toFixed(1)}`;
    try {
      if (navigator.share && isMobile) {
        await navigator.share({ title: "PebbleDrop", url });
      } else {
        await navigator.clipboard.writeText(url);
        flash("🔗 Lien copié !", "success");
      }
    } catch {
      flash("Impossible de partager.");
    }
  }, [centerOfView, isMobile, flash]);

  const exportPng = useCallback(
    (full: boolean) => {
      try {
        let url: string;
        if (full) {
          const c = document.createElement("canvas");
          c.width = GRID_WIDTH;
          c.height = GRID_HEIGHT;
          const ctx = c.getContext("2d")!;
          ctx.fillStyle = "#0e1424";
          ctx.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
          pixelsRef.current.forEach((info, key) => {
            ctx.fillStyle = info.c;
            ctx.fillRect(key % GRID_WIDTH, Math.floor(key / GRID_WIDTH), 1, 1);
          });
          url = c.toDataURL("image/png");
        } else {
          if (!canvasElRef.current) return;
          url = canvasElRef.current.toDataURL("image/png");
        }
        const a = document.createElement("a");
        a.href = url;
        a.download = full ? "pixeldrop-carte.png" : "pixeldrop-vue.png";
        a.click();
        flash("📸 Image téléchargée !", "success");
      } catch {
        flash("Export impossible.");
      }
    },
    [flash],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const c = centerOfView();
      goTo(c.x, c.y, c.z * factor);
    },
    [centerOfView, goTo],
  );

  const fitMap = useCallback(() => goTo(500, 500, 1), [goTo]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  // FAB mobile : exécute l'outil courant sur la case sélectionnée.
  const fabAction = useCallback(() => {
    if (!selected) return;
    onCellAction(selected.x, selected.y);
  }, [selected, onCellAction]);

  const xpPct = useMemo(() => {
    if (!me?.authenticated || me.xpNext == null || me.xpBase == null || me.xp == null) return 0;
    const span = me.xpNext - me.xpBase || 1;
    return Math.min(100, Math.max(0, ((me.xp - me.xpBase) / span) * 100));
  }, [me]);

  const setToolChecked = useCallback(
    (t: Tool) => {
      const meta = TOOL_META[t];
      if (meta.inv && !isAdmin && !(inv[meta.inv] > 0)) {
        flash(`Tu n'as pas de ${meta.label.toLowerCase()} — direction la boutique !`);
        return;
      }
      setTool(t);
      setMoveFrom(null);
      sfx("click");
    },
    [inv, isAdmin, flash, sfx],
  );

  // ─────────────────────────── RENDU ───────────────────────────
  return (
    <main>
      <PixelCanvas
        pixels={pixelsRef.current}
        version={version}
        previewColor={color}
        tool={tool}
        selected={isMobile ? selected : null}
        moveFrom={moveFrom}
        showGrid={showGrid}
        focus={focus}
        onCellAction={onCellAction}
        onTapSelect={isMobile ? (x, y) => { setSelected({ x, y }); sfx("click"); } : undefined}
        onLongPress={(x, y) => doInspect(x, y)}
        onHoverCell={setHover}
        onViewChange={onViewChange}
        onReady={(el) => { canvasElRef.current = el; }}
      />

      {/* Bandeau annonce admin */}
      {announcement && !announceHidden && (
        <div className="pd-announce">
          📢 {announcement}
          <button
            onClick={() => {
              setAnnounceHidden(true);
              lsSet("pd_ann", announcement);
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Barre supérieure ── */}
      <div className="pd-topbar">
        <div className="pd-panel pd-brand">
          <LogoMark size={30} />
          <div className="pd-brand-info">
            <div style={{ fontWeight: 800, fontSize: 15 }}>PebbleDrop</div>
            <div style={{ color: "var(--muted)", fontSize: 11 }}>
              {count.toLocaleString("fr-FR")} px · 🟢 {online}
            </div>
          </div>
        </div>

        <div className="pd-topright">
          {me === null ? null : me.authenticated ? (
            <>
              <div className="pd-panel pd-userpill" title={`XP ${me.xp} / ${me.xpNext}`}>
                {me.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.image} alt="" width={26} height={26} style={{ borderRadius: 7 }} />
                ) : (
                  <div className="pd-avatar">{me.pseudo?.[0]?.toUpperCase()}</div>
                )}
                <div className="pd-userpill-txt">
                  <div className="pd-userpill-name">
                    {me.equippedBadge && ITEM_LABELS[me.equippedBadge]
                      ? ITEM_LABELS[me.equippedBadge].emoji + " "
                      : ""}
                    <span
                      className={me.nameColor === "rainbow" ? "pd-rainbow-text" : undefined}
                      style={{ color: me.nameColor && me.nameColor !== "rainbow" ? me.nameColor : undefined }}
                    >
                      {me.pseudo}
                    </span>
                    {isAdmin && " 👑"}
                  </div>
                  <div className="pd-userpill-sub">
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                      {isAdmin ? "∞" : me.credits} px
                    </span>
                    <span className="pd-lvl">niv {me.level}</span>
                  </div>
                  <div className="pd-xpbar"><span style={{ width: `${xpPct}%` }} /></div>
                </div>
              </div>

              {daily.claimable && (
                <button className="pd-btn pd-gift" onClick={claimDaily} title="Récompense quotidienne">
                  🎁
                </button>
              )}
              <Link href="/boutique" className="pd-btn pd-btn-primary pd-hide-sm" style={{ textDecoration: "none" }}>
                🛒
              </Link>
              <button className="pd-btn" onClick={() => setChatOpen((o) => !o)} title="Chat">
                💬
              </button>
              <button className="pd-btn" onClick={() => setMenuOpen(true)} title="Menu">
                ☰
              </button>
            </>
          ) : (
            <>
              <button className="pd-btn" onClick={() => setChatOpen((o) => !o)} title="Chat">💬</button>
              <Link href="/login" className="pd-btn pd-hide-sm" style={{ textDecoration: "none" }}>
                Se connecter
              </Link>
              <Link href="/register" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
                Jouer
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Contrôles de zoom ── */}
      <div className="pd-zoombar">
        <button className="pd-btn pd-mini" onClick={() => zoomBy(1.4)} title="Zoomer">＋</button>
        <button className="pd-btn pd-mini" onClick={() => zoomBy(1 / 1.4)} title="Dézoomer">－</button>
        <button className="pd-btn pd-mini" onClick={fitMap} title="Toute la carte">🗺</button>
        <button className="pd-btn pd-mini" onClick={() => setMinimapOn((o) => !o)} title="Minimap">🧭</button>
        <button className="pd-btn pd-mini pd-hide-sm" onClick={toggleFullscreen} title="Plein écran">⛶</button>
        <button className="pd-btn pd-mini" onClick={shareLocation} title="Partager cet endroit">🔗</button>
      </div>

      {/* ── Minimap ── */}
      {minimapOn && (
        <canvas
          ref={minimapRef}
          width={120}
          height={120}
          className="pd-minimap"
          onClick={(e) => {
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const mx = ((e.clientX - rect.left) / rect.width) * GRID_WIDTH;
            const my = ((e.clientY - rect.top) / rect.height) * GRID_HEIGHT;
            goTo(Math.round(mx), Math.round(my), viewRef.current?.scale ?? 8);
          }}
        />
      )}

      {/* Coordonnées (souris) */}
      {hover && !isMobile && (
        <div className="pd-panel pd-coords">x {hover.x} · y {hover.y}</div>
      )}

      {/* ── Barre d'outils (connecté) ── */}
      {me?.authenticated && (
        <div className={`pd-sheet ${sheetTab ? "open" : ""}`}>
          <div className="pd-sheet-tabs">
            <button className={sheetTab === "colors" ? "on" : ""} onClick={() => setSheetTab(sheetTab === "colors" ? null : "colors")}>🎨</button>
            <button className={sheetTab === "tools" ? "on" : ""} onClick={() => setSheetTab(sheetTab === "tools" ? null : "tools")}>🛠️</button>
            <button className={sheetTab === "options" ? "on" : ""} onClick={() => setSheetTab(sheetTab === "options" ? null : "options")}>⚙️</button>
            <span className="pd-sheet-cur" style={{ background: color }} title={color} />
            <span className="pd-sheet-tool">{TOOL_META[tool].emoji}</span>
          </div>

          {sheetTab === "colors" && (
            <div className="pd-sheet-body">
              <div className="pd-palette">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); if (tool !== "swap" && tool !== "bucket") setTool("place"); }}
                    title={c}
                    className="pd-swatch"
                    style={{ background: c, outline: color === c ? "2px solid #fff" : undefined }}
                  />
                ))}
                <label className="pd-swatch pd-swatch-custom" title="Couleur personnalisée">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                  🎨
                </label>
                <button
                  className="pd-swatch pd-swatch-custom"
                  title="Couleur aléatoire"
                  onClick={() => setColor("#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"))}
                >
                  🎲
                </button>
              </div>
              {recentColors.length > 0 && (
                <div className="pd-recentcolors">
                  <span>Récentes :</span>
                  {recentColors.map((c) => (
                    <button key={c} className="pd-swatch" style={{ background: c }} onClick={() => setColor(c)} title={c} />
                  ))}
                </div>
              )}
            </div>
          )}

          {sheetTab === "tools" && (
            <div className="pd-sheet-body">
              <div className="pd-tools">
                {(Object.keys(TOOL_META) as Tool[]).map((t) => {
                  const meta = TOOL_META[t];
                  const qty = meta.inv ? (isAdmin ? "∞" : String(inv[meta.inv] || 0)) : null;
                  const disabled = !!meta.inv && !isAdmin && !(inv[meta.inv] > 0);
                  return (
                    <button
                      key={t}
                      className={`pd-btn pd-tool ${tool === t ? "on" : ""}`}
                      disabled={disabled && tool !== t}
                      onClick={() => setToolChecked(t)}
                      title={meta.label}
                    >
                      <span className="pd-tool-emoji">{meta.emoji}</span>
                      <span className="pd-tool-label">{meta.label}</span>
                      {qty !== null && <span className="pd-tool-qty">{qty}</span>}
                    </button>
                  );
                })}
              </div>
              {moveFrom && (
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--accent)" }}>
                  🛞 Caillou chargé en ({moveFrom.x}, {moveFrom.y}) —{" "}
                  <button className="pd-btn pd-mini" onClick={() => setMoveFrom(null)}>annuler</button>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <Link href="/boutique" className="pd-btn pd-btn-primary" style={{ textDecoration: "none", fontSize: 13 }}>
                  🛒 Acheter des items
                </Link>
              </div>
            </div>
          )}

          {sheetTab === "options" && (
            <div className="pd-sheet-body" style={{ display: "grid", gap: 8 }}>
              <input
                className="pd-input"
                placeholder="Lien (https://…) gravé sous le caillou"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
              <input
                className="pd-input"
                placeholder="Message (140 car. max)"
                maxLength={140}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="pd-fx-row">
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Effet :</span>
                {([
                  ["", "Aucun", null],
                  ["golden", "⭐", "golden"],
                  ["rainbow", "🌈", "rainbow"],
                  ["diamond", "💎", "diamond"],
                ] as [EffectSel, string, string | null][]).map(([val, lab, sku]) => {
                  const qty = sku ? (isAdmin ? "∞" : String(inv[sku] || 0)) : null;
                  const disabled = !!sku && !isAdmin && !(inv[sku] > 0);
                  return (
                    <button
                      key={val || "none"}
                      className={`pd-btn pd-mini ${effectSel === val ? "pd-on" : ""}`}
                      disabled={disabled}
                      onClick={() => setEffectSel(val)}
                    >
                      {lab}{qty !== null ? ` ${qty}` : ""}
                    </button>
                  );
                })}
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, opacity: isAdmin || inv.shield > 0 ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    checked={useShield}
                    disabled={!isAdmin && !(inv.shield > 0)}
                    onChange={(e) => setUseShield(e.target.checked)}
                  />
                  🛡️ ({isAdmin ? "∞" : inv.shield || 0})
                </label>
              </div>
              <div className="pd-fx-row" style={{ fontSize: 13 }}>
                <label><input type="checkbox" checked={soundOn} onChange={(e) => { setSoundOn(e.target.checked); lsSet("pd_sound", e.target.checked ? "1" : "0"); }} /> 🔊 Sons</label>
                <label><input type="checkbox" checked={vibrOn} onChange={(e) => { setVibrOn(e.target.checked); lsSet("pd_vibr", e.target.checked ? "1" : "0"); }} /> 📳 Vibrations</label>
                <label><input type="checkbox" checked={showGrid} onChange={(e) => { setShowGrid(e.target.checked); lsSet("pd_grid", e.target.checked ? "1" : "0"); }} /> ▦ Grille</label>
              </div>
              <div className="pd-fx-row">
                <button className="pd-btn pd-mini" onClick={() => exportPng(false)}>📸 PNG (vue)</button>
                <button className="pd-btn pd-mini" onClick={() => exportPng(true)}>🖼 PNG (carte)</button>
                <button className="pd-btn pd-mini" onClick={() => setHelpOpen(true)}>❓ Aide</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FAB mobile : agir sur la case sélectionnée ── */}
      {isMobile && selected && me?.authenticated && (
        <button className="pd-fab" disabled={busy} onClick={fabAction}>
          {TOOL_META[tool].emoji} {tool === "move" ? (moveFrom ? "Déposer" : "Prendre") : TOOL_META[tool].label}{" "}
          <span style={{ opacity: 0.7, fontSize: 12 }}>({selected.x},{selected.y})</span>
        </button>
      )}
      {isMobile && selected && me !== null && !me.authenticated && (
        <button className="pd-fab" onClick={() => doInspect(selected.x, selected.y)}>
          🔍 Infos ({selected.x},{selected.y})
        </button>
      )}

      {/* ── CTA invité ── */}
      {me !== null && !me.authenticated && (
        <div className="pd-guestbar pd-panel">
          <span>👀 Mode spectateur — crée un compte pour poser tes cailloux !</span>
          <Link href="/register" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
            🎁 10 cailloux offerts
          </Link>
        </div>
      )}

      {/* ── Popover info pixel ── */}
      {info && (
        <div className="pd-panel pd-info">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>Caillou ({info.x}, {info.y})</strong>
            <button className="pd-btn pd-mini" onClick={() => setInfo(null)}>✕</button>
          </div>
          {info.found ? (
            <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, background: info.color, border: "1px solid var(--border)" }} />
                <span style={{ color: "var(--muted)" }}>{info.color}</span>
                {info.effect === "golden" && <span title="Doré">⭐</span>}
                {info.effect === "rainbow" && <span title="Arc-en-ciel">🌈</span>}
                {info.effect === "diamond" && <span title="Diamant">💎</span>}
                {info.shielded && <span title="Protégé">🛡️</span>}
              </div>
              <div>
                Par{" "}
                <strong
                  className={info.ownerColor === "rainbow" ? "pd-rainbow-text" : undefined}
                  style={{ color: info.ownerColor && info.ownerColor !== "rainbow" ? info.ownerColor : undefined }}
                >
                  {info.ownerBadge && ITEM_LABELS[info.ownerBadge] ? ITEM_LABELS[info.ownerBadge].emoji + " " : ""}
                  {info.owner}
                </strong>{" "}
                <span style={{ color: "var(--muted)", fontSize: 12 }}>
                  niv {info.ownerLevel}
                  {info.ownerTitle && ITEM_LABELS[info.ownerTitle] ? ` · ${ITEM_LABELS[info.ownerTitle].label}` : ""}
                </span>
              </div>
              {info.text && <div style={{ padding: 8, background: "var(--panel-2)", borderRadius: 8 }}>{info.text}</div>}
              {info.link && (
                <a href={info.link} target="_blank" rel="noopener noreferrer nofollow" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
                  🔗 Ouvrir le lien
                </a>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="pd-btn pd-mini"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${window.location.origin}/?x=${info.x}&y=${info.y}&z=20`).catch(() => {});
                    flash("🔗 Lien du caillou copié !", "success");
                  }}
                >
                  🔗 Copier
                </button>
                {me?.authenticated && (
                  <button
                    className="pd-btn pd-mini"
                    onClick={async () => {
                      const reason = prompt("Pourquoi signaler ce caillou ?");
                      if (!reason) return;
                      const r = await fetch("/api/report", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ x: info.x, y: info.y, reason }),
                      });
                      flash(r.ok ? "🚩 Signalement envoyé." : "Échec du signalement.", r.ok ? "success" : "error");
                    }}
                  >
                    🚩 Signaler
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)" }}>Case vide — pose ton caillou ici !</div>
          )}
        </div>
      )}

      {/* ── Chat ── */}
      {chatOpen && (
        <ChatPanel
          me={me?.pseudo ?? null}
          guest={!me?.authenticated}
          isAdmin={isAdmin}
          onClose={() => setChatOpen(false)}
          onToast={flash}
          onAchievements={(ids) => celebrate({ newAchievements: ids })}
        />
      )}

      {/* ── Menu latéral ── */}
      {menuOpen && (
        <>
          <div className="pd-overlay" onClick={() => setMenuOpen(false)} />
          <div className="pd-drawer pd-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: 16 }}>Menu</strong>
              <button className="pd-btn pd-mini" onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <nav style={{ display: "grid", gap: 6 }}>
              <Link href="/boutique" className="pd-btn" style={{ textDecoration: "none", justifyContent: "flex-start" }}>🛒 Boutique</Link>
              <Link href="/classement" className="pd-btn" style={{ textDecoration: "none", justifyContent: "flex-start" }}>🏆 Classement</Link>
              <Link href="/profil" className="pd-btn" style={{ textDecoration: "none", justifyContent: "flex-start" }}>👤 Mon profil</Link>
              {isAdmin && (
                <Link href="/admin" className="pd-btn" style={{ textDecoration: "none", justifyContent: "flex-start" }}>👑 Administration</Link>
              )}
              <button className="pd-btn" style={{ justifyContent: "flex-start" }} onClick={() => { setHelpOpen(true); setMenuOpen(false); }}>
                ❓ Aide & règles
              </button>
              <button className="pd-btn" style={{ justifyContent: "flex-start" }} onClick={() => signOut({ callbackUrl: "/" })}>
                🚪 Se déconnecter
              </button>
            </nav>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--muted)" }}>⚡ Activité récente</div>
              <div style={{ display: "grid", gap: 4 }}>
                {recent.map((r, i) => (
                  <button
                    key={i}
                    className="pd-recent-row"
                    onClick={() => { goTo(r.x, r.y, 20); setMenuOpen(false); }}
                  >
                    <span className="pd-swatch" style={{ background: r.color, width: 14, height: 14 }} />
                    <span style={{ fontWeight: 600 }}>{r.pseudo}</span>
                    <span style={{ color: "var(--muted)" }}>({r.x},{r.y})</span>
                  </button>
                ))}
                {recent.length === 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>Rien pour l'instant.</span>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Aide ── */}
      {helpOpen && (
        <>
          <div className="pd-overlay" onClick={() => setHelpOpen(false)} />
          <div className="pd-modal pd-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <strong style={{ fontSize: 17 }}>❓ Comment jouer</strong>
              <button className="pd-btn pd-mini" onClick={() => setHelpOpen(false)}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 8, fontSize: 14, lineHeight: 1.5 }}>
              <p>🪨 <strong>Poser</strong> : choisis une nuance de caillou et clique une case libre (1 caillou). Une case occupée est verrouillée.</p>
              <p>📱 <strong>Mobile</strong> : tape pour viser, confirme avec le gros bouton. Pince pour zoomer, double-tape pour zoomer vite, appui long = infos.</p>
              <p>🖱️ <strong>PC</strong> : molette = zoom, glisser = déplacer, flèches et +/−. Le clic agit directement.</p>
              <p>⛏️ Pioche = 1 case · 🔨 Masse = 3×3 · 🧨 Dynamite = 5×5 (cailloux adverses non protégés).</p>
              <p>🪣 Seau = remplit les cases vides d'une zone 3×3 · 🪶 polit TES cailloux · 🛞 déplace · 🍂 ramasse.</p>
              <p>⭐🌈💎 Les pierres rares rendent ton caillou animé (et la pose ne coûte pas de caillou).</p>
              <p>🎁 Reviens chaque jour pour ta récompense · 🏆 débloque des succès et monte de niveau.</p>
            </div>
          </div>
        </>
      )}

      {/* Toasts */}
      <div className="pd-toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </main>
  );
}
