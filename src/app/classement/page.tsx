"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ITEM_LABELS } from "@/lib/products";

type Row = {
  pseudo: string;
  level: number;
  badge: string | null;
  color: string | null;
  count: number;
};

type Board = { territory: Row[]; builders: Row[]; levels: Row[] };

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ClassementPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState<keyof Board>("territory");

  useEffect(() => {
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then(setBoard)
      .catch(() => setBoard({ territory: [], builders: [], levels: [] }));
  }, []);

  const TABS: { id: keyof Board; label: string; unit: string }[] = [
    { id: "territory", label: "🏘️ Territoire", unit: "pixels possédés" },
    { id: "builders", label: "🏗️ Bâtisseurs", unit: "pixels posés" },
    { id: "levels", label: "⬆️ Niveaux", unit: "XP" },
  ];

  const rows = board?.[tab] ?? [];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Logo size={28} />
        </Link>
        <Link href="/" className="pd-btn" style={{ textDecoration: "none" }}>← Carte</Link>
      </div>

      <h1 style={{ margin: "0 0 4px", fontSize: 28 }}>🏆 Classement</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>Les meilleurs joueurs de PixelDrop.</p>

      <div style={{ display: "flex", gap: 6, margin: "16px 0", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className="pd-btn"
            style={tab === t.id ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent) inset" } : {}}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pd-panel" style={{ overflow: "hidden" }}>
        {board === null ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Chargement…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
            Personne au classement pour l'instant — sois le premier !
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.pseudo + i}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                background: i < 3 ? "rgba(255, 211, 77, 0.05)" : undefined,
              }}
            >
              <span style={{ width: 34, fontSize: i < 3 ? 20 : 14, textAlign: "center", color: "var(--muted)" }}>
                {MEDALS[i] ?? i + 1}
              </span>
              <span style={{ flex: 1, fontWeight: 600 }}>
                {r.badge && ITEM_LABELS[r.badge] ? ITEM_LABELS[r.badge].emoji + " " : ""}
                <span
                  className={r.color === "rainbow" ? "pd-rainbow-text" : undefined}
                  style={{ color: r.color && r.color !== "rainbow" ? r.color : undefined }}
                >
                  {r.pseudo}
                </span>
                <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}> · niv {r.level}</span>
              </span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                {r.count.toLocaleString("fr-FR")}
              </strong>
            </div>
          ))
        )}
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", marginTop: 8 }}>
        {TABS.find((t) => t.id === tab)?.unit}
      </p>
    </div>
  );
}
