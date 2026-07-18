"use client";

import { useEffect, useState } from "react";
import { ITEM_LABELS } from "@/lib/products";
import { ACHIEVEMENTS } from "@/lib/achievements";

type Profile = {
  found: boolean;
  pseudo?: string;
  level?: number;
  xp?: number;
  bio?: string | null;
  totalPlaced?: number;
  owned?: number;
  badge?: string | null;
  title?: string | null;
  color?: string | null;
  achievements?: string[];
  memberSince?: string;
};

// Fiche publique d'un joueur, ouverte en cliquant sur son pseudo.
export default function ProfileModal({
  pseudo,
  onClose,
}: {
  pseudo: string;
  onClose: () => void;
}) {
  const [p, setP] = useState<Profile | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/profile?pseudo=${encodeURIComponent(pseudo)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setP(d))
      .catch(() => alive && setP({ found: false }));
    return () => {
      alive = false;
    };
  }, [pseudo]);

  const achieved = new Set(p?.achievements || []);

  return (
    <>
      <div className="pd-overlay" onClick={onClose} />
      <div className="pd-modal pd-panel" style={{ width: "min(94vw, 420px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <strong style={{ fontSize: 16 }}>👤 Profil</strong>
          <button className="pd-btn pd-mini" onClick={onClose}>✕</button>
        </div>

        {!p && <div style={{ color: "var(--muted)", fontSize: 14 }}>Chargement…</div>}

        {p && !p.found && (
          <div style={{ color: "var(--muted)", fontSize: 14 }}>
            Ce joueur n&apos;existe pas (ou son compte a été fermé).
          </div>
        )}

        {p && p.found && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                style={{
                  width: 52, height: 52, borderRadius: 14, background: "var(--panel-2)",
                  display: "grid", placeItems: "center", fontSize: 24, fontWeight: 800,
                }}
              >
                {p.pseudo?.[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 800 }}>
                  {p.badge && ITEM_LABELS[p.badge] ? ITEM_LABELS[p.badge].emoji + " " : ""}
                  <span
                    className={p.color === "rainbow" ? "pd-rainbow-text" : undefined}
                    style={{ color: p.color && p.color !== "rainbow" ? p.color : undefined }}
                  >
                    {p.pseudo}
                  </span>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12.5 }}>
                  {p.title && ITEM_LABELS[p.title] ? `« ${ITEM_LABELS[p.title].label} » · ` : ""}
                  Niveau {p.level}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 11.5 }}>
                  Membre depuis {p.memberSince ? new Date(p.memberSince).toLocaleDateString("fr-FR") : "—"}
                </div>
              </div>
            </div>

            {p.bio && (
              <div style={{ background: "var(--panel-2)", padding: 10, borderRadius: 10, fontSize: 13.5 }}>
                {p.bio}
              </div>
            )}

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Stat value={p.owned ?? 0} label="cailloux possédés" />
              <Stat value={p.totalPlaced ?? 0} label="cailloux posés" />
              <Stat value={p.xp ?? 0} label="XP" />
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--muted)", marginBottom: 6 }}>
                🏆 Succès ({achieved.size}/{Object.keys(ACHIEVEMENTS).length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {Object.entries(ACHIEVEMENTS).map(([id, a]) => (
                  <span
                    key={id}
                    title={`${a.label} — ${a.desc}`}
                    style={{ fontSize: 17, opacity: achieved.has(id) ? 1 : 0.22 }}
                  >
                    {a.emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 800 }}>{value.toLocaleString("fr-FR")}</div>
      <div style={{ color: "var(--muted)", fontSize: 11.5 }}>{label}</div>
    </div>
  );
}
