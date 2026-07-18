"use client";

import { useCallback, useEffect, useState } from "react";
import { ITEM_LABELS } from "@/lib/products";
import { parseItems } from "@/lib/quest-types";

export type Quest = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  goalType: string;
  goalParam: string | null;
  target: number;
  progress: number;
  pct: number;
  endAt: string;
  status: string;
  rewardCredits: number;
  rewardXp: number;
  rewardItems: string;
};

export function timeLeft(endAt: string): { text: string; urgent: boolean; over: boolean } {
  const ms = new Date(endAt).getTime() - Date.now();
  if (ms <= 0) return { text: "terminé", urgent: false, over: true };
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h >= 24) return { text: `${Math.floor(h / 24)} j ${h % 24} h`, urgent: false, over: false };
  if (h >= 1) return { text: `${h} h ${m} min`, urgent: h < 3, over: false };
  return { text: `${m} min`, urgent: true, over: false };
}

export function rewardLabel(q: {
  rewardCredits: number;
  rewardXp: number;
  rewardItems: string;
}): string {
  const parts: string[] = [];
  if (q.rewardCredits > 0) parts.push(`🪨 ${q.rewardCredits} cailloux`);
  if (q.rewardXp > 0) parts.push(`✨ ${q.rewardXp} XP`);
  for (const [sku, qty] of Object.entries(parseItems(q.rewardItems))) {
    const it = ITEM_LABELS[sku];
    parts.push(`${it ? it.emoji : "🎁"} ${qty} ${it ? it.label : sku}`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

export default function QuestsPanel({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<Quest[]>([]);
  const [recent, setRecent] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/quests", { cache: "no-store" });
      const d = await r.json();
      setActive(d.active || []);
      setRecent(d.recent || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <>
      <div className="pd-overlay" onClick={onClose} />
      <div className="pd-modal pd-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <strong style={{ fontSize: 17 }}>🎯 Quêtes collectives</strong>
          <button className="pd-btn pd-mini" onClick={onClose}>✕</button>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
          Tout le monde y contribue. Objectif atteint à temps = <strong>récompense pour
          tous les joueurs</strong>.
        </p>

        {loading && <div style={{ color: "var(--muted)", fontSize: 14 }}>Chargement…</div>}

        {!loading && active.length === 0 && (
          <div className="pd-panel" style={{ padding: 14, background: "var(--panel-2)", fontSize: 14 }}>
            Aucune quête en cours pour l&apos;instant — reviens bientôt !
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {active.map((q) => {
            const t = timeLeft(q.endAt);
            return (
              <div key={q.id} className="pd-panel" style={{ padding: 14, background: "var(--panel-2)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 26, lineHeight: 1 }}>{q.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{q.title}</div>
                    {q.description && (
                      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{q.description}</div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      color: t.urgent ? "#c2261a" : "var(--muted)",
                    }}
                  >
                    ⏳ {t.text}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ height: 10, borderRadius: 999, background: "var(--panel)", overflow: "hidden", border: "1px solid var(--border)" }}>
                    <div
                      style={{
                        width: `${q.pct}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                    <span style={{ fontWeight: 700 }}>
                      {q.progress.toLocaleString("fr-FR")} / {q.target.toLocaleString("fr-FR")}
                    </span>
                    <span style={{ color: "var(--muted)" }}>{q.pct.toFixed(1)} %</span>
                  </div>
                </div>

                <div style={{ marginTop: 8, fontSize: 12.5 }}>
                  🎁 <strong>Récompense pour tous :</strong> {rewardLabel(q)}
                </div>
              </div>
            );
          })}
        </div>

        {recent.length > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 16, marginBottom: 6, color: "var(--muted)" }}>
              Historique
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {recent.map((q) => (
                <div key={q.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <span>{q.emoji}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {q.title}
                  </span>
                  <span style={{ fontWeight: 700, color: q.status === "success" ? "#2f6440" : "#c2261a" }}>
                    {q.status === "success" ? "✅ réussie" : "❌ échouée"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
