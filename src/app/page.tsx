"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import PixelCanvas, { keyOf, type PixelMap } from "@/components/PixelCanvas";
import { PALETTE, GRID_WIDTH, GRID_HEIGHT } from "@/lib/canvas-config";

type Me = {
  authenticated: boolean;
  id?: string;
  pseudo?: string;
  image?: string | null;
  isAdmin?: boolean;
  banned?: boolean;
  credits?: number;
  totalPlaced?: number;
  inventory?: Record<string, number>;
};

type Info = {
  found: boolean;
  x: number;
  y: number;
  color: string;
  link?: string | null;
  text?: string | null;
  golden?: boolean;
  shielded?: boolean;
  owner?: string;
};

type Tool = "place" | "inspect" | "bomb" | "megabomb";

export default function Home() {
  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const pixelsRef = useRef<PixelMap>(new Map());
  const [version, setVersion] = useState(0);
  const [count, setCount] = useState(0);

  const [color, setColor] = useState<string>("#ed1c24");
  const [tool, setTool] = useState<Tool>("place");
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [useGolden, setUseGolden] = useState(false);
  const [useShield, setUseShield] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null);
  const [busy, setBusy] = useState(false);

  const bump = () => setVersion((v) => v + 1);
  const flash = (msg: string, type: "error" | "success" = "error") => {
    setToast({ msg, type });
    window.clearTimeout((flash as any)._t);
    (flash as any)._t = window.setTimeout(() => setToast(null), 3200);
  };

  const loadMe = useCallback(async () => {
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      const data = await r.json();
      setMe(data);
    } catch {
      setMe({ authenticated: false });
    } finally {
      setLoadingMe(false);
    }
  }, []);

  const loadPixels = useCallback(async () => {
    try {
      const r = await fetch("/api/pixels", { cache: "no-store" });
      const data = await r.json();
      const map: PixelMap = new Map();
      for (const [x, y, c, g, i] of data.p as [number, number, string, number, number][]) {
        map.set(keyOf(x, y), { c, g: !!g, i: !!i });
      }
      pixelsRef.current = map;
      setCount(map.size);
      bump();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadMe();
    loadPixels();
  }, [loadMe, loadPixels]);

  // Rafraîchissement temps réel (polling).
  useEffect(() => {
    const t = setInterval(loadPixels, 3000);
    return () => clearInterval(t);
  }, [loadPixels]);

  const inv = me?.inventory || {};
  const isAdmin = !!me?.isAdmin;

  const doPlace = useCallback(
    async (x: number, y: number) => {
      if (!me?.authenticated) {
        flash("Connecte-toi pour poser un pixel.");
        return;
      }
      setBusy(true);
      try {
        const r = await fetch("/api/pixels/place", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            x,
            y,
            color,
            link: link || undefined,
            text: text || undefined,
            golden: useGolden,
            shield: useShield,
          }),
        });
        const data = await r.json();
        if (!r.ok) {
          flash(data.error || "Impossible de poser ici.");
          loadPixels();
          return;
        }
        pixelsRef.current.set(keyOf(x, y), {
          c: color,
          g: useGolden,
          i: !!(link || text),
        });
        setCount(pixelsRef.current.size);
        bump();
        setMe((m) => (m ? { ...m, credits: data.credits } : m));
        loadMe();
        setUseGolden(false);
        setUseShield(false);
        flash("Pixel posé ✅", "success");
      } finally {
        setBusy(false);
      }
    },
    [me, color, link, text, useGolden, useShield, loadPixels, loadMe],
  );

  const doBomb = useCallback(
    async (x: number, y: number, mega: boolean) => {
      if (!me?.authenticated) {
        flash("Connecte-toi d'abord.");
        return;
      }
      setBusy(true);
      try {
        const r = await fetch("/api/pixels/bomb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x, y, mega }),
        });
        const data = await r.json();
        if (!r.ok) {
          flash(data.error || "Échec.");
          return;
        }
        for (const c of data.removed as { x: number; y: number }[]) {
          pixelsRef.current.delete(keyOf(c.x, c.y));
        }
        setCount(pixelsRef.current.size);
        bump();
        loadMe();
        flash(`💥 ${data.removed.length} pixel(s) détruit(s)`, "success");
      } finally {
        setBusy(false);
      }
    },
    [me, loadMe],
  );

  const doInspect = useCallback(async (x: number, y: number) => {
    try {
      const r = await fetch(`/api/pixels/at?x=${x}&y=${y}`, { cache: "no-store" });
      const data = await r.json();
      if (data.found) setInfo(data);
      else setInfo({ found: false, x, y, color: "" });
    } catch {
      /* ignore */
    }
  }, []);

  const onCellAction = useCallback(
    (x: number, y: number) => {
      if (busy) return;
      if (tool === "place") doPlace(x, y);
      else if (tool === "inspect") doInspect(x, y);
      else if (tool === "bomb") doBomb(x, y, false);
      else if (tool === "megabomb") doBomb(x, y, true);
    },
    [tool, busy, doPlace, doInspect, doBomb],
  );

  return (
    <main>
      <PixelCanvas
        pixels={pixelsRef.current}
        version={version}
        previewColor={color}
        tool={tool}
        onCellAction={onCellAction}
        onHoverCell={setHover}
      />

      {/* Barre supérieure */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          right: 12,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          zIndex: 40,
          pointerEvents: "none",
        }}
      >
        <div className="pd-panel" style={{ padding: "10px 14px", pointerEvents: "auto" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            🟦 PixelDrop
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            {count.toLocaleString("fr-CH")} / {(GRID_WIDTH * GRID_HEIGHT).toLocaleString("fr-CH")} pixels posés
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, pointerEvents: "auto", alignItems: "flex-start" }}>
          {loadingMe ? null : me?.authenticated ? (
            <>
              <div className="pd-panel" style={{ padding: "8px 12px", display: "flex", gap: 10, alignItems: "center" }}>
                {me.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.image} alt="" width={28} height={28} style={{ borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--panel-2)", display: "grid", placeItems: "center" }}>
                    {me.pseudo?.[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {me.pseudo} {isAdmin && <span title="Admin">👑</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--accent)" }}>
                    {isAdmin ? "∞" : me.credits} pixel{me.credits === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <Link href="/boutique" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
                🛒 Boutique
              </Link>
              {isAdmin && (
                <Link href="/admin" className="pd-btn" style={{ textDecoration: "none" }}>
                  👑 Admin
                </Link>
              )}
              <button className="pd-btn" onClick={() => signOut({ callbackUrl: "/" })}>
                Quitter
              </button>
            </>
          ) : (
            <Link href="/login" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
              Se connecter
            </Link>
          )}
        </div>
      </div>

      {/* Coordonnées */}
      {hover && (
        <div
          className="pd-panel"
          style={{ position: "fixed", bottom: 12, left: 12, padding: "6px 10px", fontSize: 12, zIndex: 40, fontVariantNumeric: "tabular-nums" }}
        >
          x {hover.x} · y {hover.y}
        </div>
      )}

      {/* Barre d'outils du bas */}
      {me?.authenticated && (
        <div
          className="pd-panel"
          style={{
            position: "fixed",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            padding: 12,
            zIndex: 45,
            maxWidth: "min(96vw, 720px)",
            width: "max-content",
          }}
        >
          {/* Palette */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10, maxWidth: 560 }}>
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool("place"); }}
                title={c}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: c,
                  border: color === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.15)",
                }}
              />
            ))}
            <label
              title="Couleur personnalisée"
              style={{ width: 22, height: 22, borderRadius: 5, overflow: "hidden", border: "1px solid var(--border)", position: "relative" }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => { setColor(e.target.value); setTool("place"); }}
                style={{ position: "absolute", inset: -4, width: 34, height: 34, cursor: "pointer" }}
              />
            </label>
          </div>

          {/* Outils */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <button className="pd-btn" style={toolStyle(tool === "place")} onClick={() => setTool("place")}>
              🖌️ Poser
            </button>
            <button className="pd-btn" style={toolStyle(tool === "inspect")} onClick={() => setTool("inspect")}>
              🔍 Infos
            </button>
            <button
              className="pd-btn"
              style={toolStyle(tool === "bomb")}
              disabled={!isAdmin && !(inv.bomb > 0)}
              onClick={() => setTool("bomb")}
              title="Bombe"
            >
              💣 {isAdmin ? "∞" : inv.bomb || 0}
            </button>
            <button
              className="pd-btn"
              style={toolStyle(tool === "megabomb")}
              disabled={!isAdmin && !(inv.mega_bomb > 0)}
              onClick={() => setTool("megabomb")}
              title="Méga-bombe (3×3)"
            >
              💥 {isAdmin ? "∞" : inv.mega_bomb || 0}
            </button>
            <button className="pd-btn" onClick={() => setShowExtras((s) => !s)}>
              {showExtras ? "▲" : "▼"} Options
            </button>
          </div>

          {/* Options : lien, texte, doré, bouclier */}
          {showExtras && (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <input
                className="pd-input"
                placeholder="Lien (https://…) — affiché au clic sur le pixel"
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
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13 }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center", opacity: isAdmin || inv.golden > 0 ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    checked={useGolden}
                    disabled={!isAdmin && !(inv.golden > 0)}
                    onChange={(e) => setUseGolden(e.target.checked)}
                  />
                  ⭐ Pixel doré ({isAdmin ? "∞" : inv.golden || 0})
                </label>
                <label style={{ display: "flex", gap: 6, alignItems: "center", opacity: isAdmin || inv.shield > 0 ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    checked={useShield}
                    disabled={!isAdmin && !(inv.shield > 0)}
                    onChange={(e) => setUseShield(e.target.checked)}
                  />
                  🛡️ Bouclier ({isAdmin ? "∞" : inv.shield || 0})
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Popover d'info pixel */}
      {info && (
        <div
          className="pd-panel"
          style={{ position: "fixed", right: 12, bottom: 12, zIndex: 50, padding: 14, width: 280, maxWidth: "92vw" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>Pixel ({info.x}, {info.y})</strong>
            <button className="pd-btn" style={{ padding: "2px 8px" }} onClick={() => setInfo(null)}>✕</button>
          </div>
          {info.found ? (
            <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, background: info.color, border: "1px solid var(--border)" }} />
                <span style={{ color: "var(--muted)" }}>{info.color}</span>
                {info.golden && <span title="Doré">⭐</span>}
                {info.shielded && <span title="Protégé">🛡️</span>}
              </div>
              <div>Par <strong>{info.owner}</strong></div>
              {info.text && <div style={{ padding: 8, background: "var(--panel-2)", borderRadius: 8 }}>{info.text}</div>}
              {info.link && (
                <a href={info.link} target="_blank" rel="noopener noreferrer nofollow" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
                  🔗 Ouvrir le lien
                </a>
              )}
            </div>
          ) : (
            <div style={{ color: "var(--muted)" }}>Case vide — pose ton pixel ici !</div>
          )}
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      {/* Aide première visite (non connecté) */}
      {!loadingMe && !me?.authenticated && (
        <div
          className="pd-panel"
          style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 45, padding: 16, textAlign: "center", width: "min(92vw, 460px)" }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Bienvenue sur PixelDrop 🎨</div>
          <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 12 }}>
            Connecte-toi pour recevoir <strong>10 pixels gratuits</strong> et commencer à dessiner.
          </div>
          <Link href="/login" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
            Commencer
          </Link>
        </div>
      )}
    </main>
  );
}

function toolStyle(active: boolean): React.CSSProperties {
  return active
    ? { borderColor: "var(--accent)", background: "var(--panel-2)", boxShadow: "0 0 0 1px var(--accent) inset" }
    : {};
}
