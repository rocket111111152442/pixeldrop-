"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import PixelCanvas, {
  keyOf,
  type PixelMap,
  type PixelInfo,
  type ViewInfo,
  type Focus,
} from "@/components/PixelCanvas";
import ChatPanel from "@/components/ChatPanel";
import CanvasBackdrop, { type BackdropHandle } from "@/components/CanvasBackdrop";
import QuestsPanel from "@/components/QuestsPanel";
import ProfileModal from "@/components/ProfileModal";
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
  | "explore" | "place" | "inspect" | "bomb" | "megabomb" | "nuke"
  | "bucket" | "swap" | "move" | "erase" | "pick";

type EffectSel = "" | "golden" | "rainbow" | "diamond";

type Toast = { id: number; msg: string; type: "error" | "success" | "gold" };

type Recent = { x: number; y: number; color: string; pseudo: string; at: string };

// Les libellés suivent le thème « cailloux » de la boutique.
const TOOL_META: Record<Tool, { emoji: string; label: string; inv?: string }> = {
  explore: { emoji: "🖐️", label: "Explorer" },
  place: { emoji: "🪨", label: "Poser" },
  inspect: { emoji: "🔍", label: "Infos" },
  pick: { emoji: "💧", label: "Pipette" },
  bomb: { emoji: "⛏️", label: "Pioche", inv: "bomb" },
  megabomb: { emoji: "🔨", label: "Masse", inv: "mega_bomb" },
  nuke: { emoji: "🧨", label: "Dynamite", inv: "nuke" },
  bucket: { emoji: "🪣", label: "Seau", inv: "bucket" },
  swap: { emoji: "🪶", label: "Polissoir", inv: "swap" },
  move: { emoji: "🛞", label: "Brouette", inv: "mover" },
  erase: { emoji: "🍂", label: "Râteau", inv: "eraser" },
};

// Pierres rares posables (consomment un item au lieu d'un caillou).
const EFFECT_ITEMS: { id: "golden" | "rainbow" | "diamond"; emoji: string; label: string }[] = [
  { id: "golden", emoji: "⭐", label: "Pépite" },
  { id: "rainbow", emoji: "🌈", label: "Opale" },
  { id: "diamond", emoji: "💎", label: "Diamant" },
];

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
  const [brush, setBrush] = useState(false);

  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);

  const [sheetTab, setSheetTab] = useState<"colors" | "tools" | "options" | null>("colors");
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [profileOf, setProfileOf] = useState<string | null>(null);
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
  const backdropRef = useRef<BackdropHandle | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const focusKeyRef = useRef(1);
  const toastIdRef = useRef(1);
  // Pinceau : tampon des cailloux peints pendant le geste.
  const paintBufRef = useRef<{ x: number; y: number }[]>([]);
  const paintSeenRef = useRef<Set<number>>(new Set());
  const paintedCountRef = useRef(0);
  const bumpRafRef = useRef<number | null>(null);

  // ── Réconciliation optimiste ──
  // Le serveur met parfois 1-2 s à publier une pose. Sans ça, le
  // rafraîchissement périodique écraserait la carte et ferait « clignoter »
  // les cailloux qu'on vient de poser. On garde donc les changements locaux
  // jusqu'à ce que le serveur les confirme (ou 20 s max).
  const PENDING_MS = 20_000;
  const pendingAddRef = useRef<Map<number, { info: PixelInfo; until: number }>>(new Map());
  const pendingDelRef = useRef<Map<number, number>>(new Map());

  const markAdd = (key: number, info: PixelInfo) => {
    pendingDelRef.current.delete(key);
    pendingAddRef.current.set(key, { info, until: Date.now() + PENDING_MS });
  };
  const markDel = (key: number) => {
    pendingAddRef.current.delete(key);
    pendingDelRef.current.set(key, Date.now() + PENDING_MS);
  };
  const unmark = (key: number) => {
    pendingAddRef.current.delete(key);
    pendingDelRef.current.delete(key);
  };

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

      // Réapplique les changements locaux que le serveur n'a pas encore publiés,
      // sinon les cailloux fraîchement posés clignoteraient.
      const now = Date.now();
      pendingAddRef.current.forEach((entry, key) => {
        if (now > entry.until) {
          pendingAddRef.current.delete(key);
          return;
        }
        if (map.has(key)) {
          pendingAddRef.current.delete(key); // confirmé par le serveur
          return;
        }
        map.set(key, entry.info);
      });
      pendingDelRef.current.forEach((until, key) => {
        if (now > until) {
          pendingDelRef.current.delete(key);
          return;
        }
        if (!map.has(key)) {
          pendingDelRef.current.delete(key); // suppression confirmée
          return;
        }
        map.delete(key);
      });

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
      // Parallaxe du décor (via ref : aucun rendu React déclenché).
      backdropRef.current?.setShift(v.panX, v.panY);
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

  // Pose instantanée (optimiste, non bloquante) : le caillou apparaît tout de
  // suite, la requête part en arrière-plan et se réconcilie ensuite.
  const doPlace = useCallback(
    (x: number, y: number) => {
      if (!me?.authenticated) return needAccount();
      const key = keyOf(x, y);
      if (!isAdmin && pixelsRef.current.has(key)) {
        flash("Cette case est déjà occupée.");
        sfx("error");
        return;
      }
      if (!isAdmin && !effectSel && (me.credits ?? 0) <= 0) {
        flash("Plus de cailloux ! Prends un sac dans la boutique.");
        sfx("error");
        return;
      }

      const snapColor = color;
      const snapLink = link;
      const snapText = text;
      const snapEffect = effectSel;
      const snapShield = useShield;
      const eCode = snapEffect === "golden" ? 1 : snapEffect === "rainbow" ? 2 : snapEffect === "diamond" ? 3 : 0;

      // Affichage immédiat
      const optimistic: PixelInfo = { c: snapColor, e: eCode, i: !!(snapLink || snapText) };
      pixelsRef.current.set(key, optimistic);
      markAdd(key, optimistic);
      setCount(pixelsRef.current.size);
      bump();
      rememberColor(snapColor);
      if (!isAdmin && !snapEffect) {
        setMe((m) => (m ? { ...m, credits: Math.max(0, (m.credits ?? 0) - 1) } : m));
      }
      setEffectSel("");
      setUseShield(false);
      sfx("place");
      buzz(10);

      (async () => {
        try {
          const r = await fetch("/api/pixels/place", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              x, y, color: snapColor,
              link: snapLink || undefined,
              text: snapText || undefined,
              effect: snapEffect || undefined,
              shield: snapShield,
            }),
          });
          const data = await r.json();
          if (!r.ok) {
            flash(data.error || "Impossible de poser ici.");
            sfx("error");
            pixelsRef.current.delete(key);
            unmark(key);
            setCount(pixelsRef.current.size);
            bump();
            loadMe();
            return;
          }
          applyProgress(data);
          if (snapEffect || snapShield) loadMe();
        } catch {
          pixelsRef.current.delete(key);
          unmark(key);
          setCount(pixelsRef.current.size);
          bump();
          loadMe();
        }
      })();
    },
    [me, isAdmin, color, link, text, effectSel, useShield, flash, sfx, buzz, loadMe, rememberColor, applyProgress, needAccount],
  );

  // ── Pinceau : peindre plusieurs cailloux au glisser ──
  const scheduleBump = useCallback(() => {
    if (bumpRafRef.current != null) return;
    bumpRafRef.current = requestAnimationFrame(() => {
      bumpRafRef.current = null;
      setCount(pixelsRef.current.size);
      setVersion((v) => v + 1);
    });
  }, []);

  const onPaint = useCallback(
    (x: number, y: number) => {
      if (!me?.authenticated) {
        needAccount();
        return;
      }
      const key = keyOf(x, y);
      if (pixelsRef.current.has(key)) return; // case occupée
      if (paintSeenRef.current.has(key)) return;
      if (!isAdmin && paintedCountRef.current >= (me.credits ?? 0)) return; // budget épuisé
      paintSeenRef.current.add(key);
      paintBufRef.current.push({ x, y });
      paintedCountRef.current++;
      const info: PixelInfo = { c: color, e: 0, i: false };
      pixelsRef.current.set(key, info);
      markAdd(key, info);
      scheduleBump();
    },
    [me, isAdmin, color, needAccount, scheduleBump],
  );

  const onPaintEnd = useCallback(async () => {
    const painted = paintBufRef.current;
    paintBufRef.current = [];
    paintSeenRef.current = new Set();
    paintedCountRef.current = 0;
    if (painted.length === 0) return;
    sfx("place");
    buzz(18);
    const snapColor = color;
    try {
      const r = await fetch("/api/pixels/place-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cells: painted, color: snapColor }),
      });
      const data = await r.json();
      if (!r.ok) {
        flash(data.error || "Pose impossible.");
        for (const c of painted) {
          const k = keyOf(c.x, c.y);
          pixelsRef.current.delete(k);
          unmark(k);
        }
        setCount(pixelsRef.current.size);
        bump();
        loadMe();
        return;
      }
      const placedSet = new Set(
        (data.placed as { x: number; y: number }[]).map((c) => keyOf(c.x, c.y)),
      );
      for (const c of painted) {
        const k = keyOf(c.x, c.y);
        if (!placedSet.has(k)) {
          pixelsRef.current.delete(k);
          unmark(k);
        }
      }
      setCount(pixelsRef.current.size);
      bump();
      setMe((m) => (m ? { ...m, credits: data.credits } : m));
      const n = data.placed.length;
      if (n < painted.length) flash(`🪨 ${n} caillou(x) posé(s) (crédits/occupé)`, "success");
      else flash(`🪨 ${n} caillou(x) posé(s) !`, "success");
    } catch {
      for (const c of painted) pixelsRef.current.delete(keyOf(c.x, c.y));
      setCount(pixelsRef.current.size);
      bump();
      loadMe();
    }
  }, [color, sfx, buzz, flash, loadMe]);

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
          const k = keyOf(c.x, c.y);
          pixelsRef.current.delete(k);
          markDel(k);
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
          const k = keyOf(c.x, c.y);
          const info: PixelInfo = { c: color, e: 0, i: false };
          pixelsRef.current.set(k, info);
          markAdd(k, info);
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
        const info: PixelInfo = { c: color, e: prev?.e ?? 0, i: prev?.i ?? false };
        pixelsRef.current.set(keyOf(x, y), info);
        markAdd(keyOf(x, y), info);
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
        markDel(keyOf(x, y));
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
        const fromKey = keyOf(moveFrom.x, moveFrom.y);
        const toKey = keyOf(x, y);
        const src = pixelsRef.current.get(fromKey);
        const info: PixelInfo = src ?? { c: data.pixel.color, e: 0, i: false };
        pixelsRef.current.delete(fromKey);
        markDel(fromKey);
        pixelsRef.current.set(toKey, info);
        markAdd(toKey, info);
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
        case "explore": return; // navigation seule : on ne pose rien
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
      <CanvasBackdrop ref={backdropRef} />
      <PixelCanvas
        pixels={pixelsRef.current}
        version={version}
        previewColor={color}
        tool={tool}
        selected={isMobile ? selected : null}
        moveFrom={moveFrom}
        showGrid={showGrid}
        brush={brush && tool === "place"}
        focus={focus}
        onCellAction={onCellAction}
        onTapSelect={
          isMobile
            ? (x, y) => {
                // Pose/inspection/pipette = action directe (fluide) ;
                // les outils destructeurs passent par le bouton de confirmation.
                if (tool === "explore") return; // on se contente de naviguer
                if (tool === "place" || tool === "inspect" || tool === "pick") onCellAction(x, y);
                else { setSelected({ x, y }); sfx("click"); }
              }
            : undefined
        }
        onLongPress={(x, y) => doInspect(x, y)}
        onHoverCell={setHover}
        onViewChange={onViewChange}
        onPaint={onPaint}
        onPaintEnd={onPaintEnd}
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
              <button className="pd-btn" onClick={() => setQuestsOpen(true)} title="Quêtes collectives">
                🎯
              </button>
              <button className="pd-btn" onClick={() => setChatOpen((o) => !o)} title="Chat">
                💬
              </button>
              <button className="pd-btn" onClick={() => setMenuOpen(true)} title="Menu">
                ☰
              </button>
            </>
          ) : (
            <>
              <button className="pd-btn" onClick={() => setQuestsOpen(true)} title="Quêtes collectives">🎯</button>
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
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <button
                  className={`pd-btn pd-mini ${brush ? "pd-on" : ""}`}
                  onClick={() => { setBrush((b) => !b); setTool("place"); sfx("click"); }}
                  title="Façon de poser : au clic, ou en glissant"
                >
                  {brush ? "🖌️ Pose au glisser" : "👆 Pose au clic"}
                </button>
                <button
                  className={`pd-btn pd-mini ${tool === "explore" ? "pd-on" : ""}`}
                  onClick={() => { setTool("explore"); sfx("click"); }}
                  title="Se déplacer sans rien poser"
                >
                  🖐️ Explorer
                </button>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {tool === "explore"
                    ? "Tu ne poses rien — balade-toi tranquille."
                    : brush
                      ? "Glisse pour poser une traînée · 2 doigts = déplacer"
                      : "Clique pour poser · glisse pour déplacer"}
                </span>
              </div>
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

              {/* Pierres rares & protection : s'appliquent au prochain caillou posé */}
              <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                  💎 Pierres rares & protection <span style={{ fontWeight: 400 }}>(sur le prochain caillou posé)</span>
                </div>
                <div className="pd-tools">
                  <button
                    className={`pd-btn pd-tool ${effectSel === "" ? "on" : ""}`}
                    onClick={() => { setEffectSel(""); sfx("click"); }}
                    title="Caillou normal"
                  >
                    <span className="pd-tool-emoji">🪨</span>
                    <span className="pd-tool-label">Normal</span>
                  </button>
                  {EFFECT_ITEMS.map((fx) => {
                    const qty = isAdmin ? "∞" : String(inv[fx.id] || 0);
                    const disabled = !isAdmin && !(inv[fx.id] > 0);
                    return (
                      <button
                        key={fx.id}
                        className={`pd-btn pd-tool ${effectSel === fx.id ? "on" : ""}`}
                        disabled={disabled}
                        onClick={() => { setEffectSel(fx.id); setTool("place"); sfx("click"); }}
                        title={`${fx.label} — pose sans consommer de caillou`}
                      >
                        <span className="pd-tool-emoji">{fx.emoji}</span>
                        <span className="pd-tool-label">{fx.label}</span>
                        <span className="pd-tool-qty">{qty}</span>
                      </button>
                    );
                  })}
                  <button
                    className={`pd-btn pd-tool ${useShield ? "on" : ""}`}
                    disabled={!isAdmin && !(inv.shield > 0)}
                    onClick={() => { setUseShield((s) => !s); sfx("click"); }}
                    title="Mousse protectrice : résiste aux pioches"
                  >
                    <span className="pd-tool-emoji">🛡️</span>
                    <span className="pd-tool-label">Mousse</span>
                    <span className="pd-tool-qty">{isAdmin ? "∞" : inv.shield || 0}</span>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Link href="/boutique" className="pd-btn pd-btn-primary" style={{ textDecoration: "none", fontSize: 13 }}>
                  🛒 Boutique
                </Link>
                <Link href="/profil" className="pd-btn pd-mini" style={{ textDecoration: "none" }}>
                  👑 Badges, titres & couleurs
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
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                💎 Les pierres rares et la mousse 🛡️ se choisissent dans l&apos;onglet 🛠️.
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
                <button
                  onClick={() => info.owner && info.owner !== "?" && setProfileOf(info.owner)}
                  title="Voir le profil"
                  style={{
                    background: "none", border: "none", padding: 0, font: "inherit",
                    fontWeight: 700, cursor: "pointer", textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  <span
                    className={info.ownerColor === "rainbow" ? "pd-rainbow-text" : undefined}
                    style={{ color: info.ownerColor && info.ownerColor !== "rainbow" ? info.ownerColor : undefined }}
                  >
                    {info.ownerBadge && ITEM_LABELS[info.ownerBadge] ? ITEM_LABELS[info.ownerBadge].emoji + " " : ""}
                    {info.owner}
                  </span>
                </button>{" "}
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
          onOpenProfile={(p) => setProfileOf(p)}
        />
      )}

      {/* ── Quêtes collectives ── */}
      {questsOpen && <QuestsPanel onClose={() => setQuestsOpen(false)} />}

      {/* ── Fiche d'un joueur ── */}
      {profileOf && <ProfileModal pseudo={profileOf} onClose={() => setProfileOf(null)} />}

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
              <p>🖐️ <strong>Explorer</strong> : mode balade — tu peux zoomer et te déplacer <strong>sans rien poser</strong> (pratique pour regarder la carte sans dépenser).</p>
              <p>🖌️ <strong>Pose au glisser</strong> : active-la pour poser une traînée de cailloux d&apos;un seul geste (2 doigts pour te déplacer).</p>
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
