"use client";

import { useCallback, useEffect, useState } from "react";
import { GOAL_TYPES } from "@/lib/quest-types";
import { ITEM_LABELS } from "@/lib/products";
import { rewardLabel, timeLeft } from "@/components/QuestsPanel";

type AdminQuest = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  goalType: string;
  goalParam: string | null;
  target: number;
  progress: number;
  endAt: string;
  status: string;
  rewardCredits: number;
  rewardXp: number;
  rewardItems: string;
  distributedAt: string | null;
};

const EMPTY = {
  title: "",
  description: "",
  emoji: "🎯",
  goalType: "place",
  goalParam: "",
  target: 100,
  durationHours: 24,
  rewardCredits: 10,
  rewardXp: 50,
  rewardItems: "",
};

export default function AdminQuests({ onMsg }: { onMsg: (m: string) => void }) {
  const [quests, setQuests] = useState<AdminQuest[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/quests", { cache: "no-store" });
    const d = await r.json();
    setQuests(d.quests || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (method: string, body: unknown) => {
    const r = await fetch("/api/admin/quests", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    onMsg(r.ok ? "✅ OK" : d.error || "Erreur");
    load();
    return r.ok;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = editing
      ? await send("PATCH", { id: editing, ...form })
      : await send("POST", form);
    if (ok) {
      setForm({ ...EMPTY });
      setEditing(null);
      setOpen(false);
    }
  };

  const startEdit = (q: AdminQuest) => {
    setEditing(q.id);
    setOpen(true);
    setForm({
      title: q.title,
      description: q.description,
      emoji: q.emoji,
      goalType: q.goalType,
      goalParam: q.goalParam || "",
      target: q.target,
      durationHours: 24,
      rewardCredits: q.rewardCredits,
      rewardXp: q.rewardXp,
      rewardItems: q.rewardItems,
    });
  };

  const goal = GOAL_TYPES.find((g) => g.id === form.goalType);

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>🎯 Quêtes collectives</h2>
        <button
          className="pd-btn pd-btn-primary"
          onClick={() => {
            setOpen((o) => !o);
            setEditing(null);
            setForm({ ...EMPTY });
          }}
        >
          {open ? "Fermer" : "➕ Nouvelle quête"}
        </button>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
        Objectif atteint avant la date limite → <strong>tous les joueurs</strong> reçoivent
        la récompense, automatiquement.
      </p>

      {open && (
        <form onSubmit={submit} className="pd-panel" style={{ padding: 16, display: "grid", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="pd-input" style={{ width: 70, textAlign: "center", fontSize: 20 }}
              value={form.emoji} maxLength={4}
              onChange={(e) => setForm({ ...form, emoji: e.target.value })} title="Emoji"
            />
            <input
              className="pd-input" style={{ flex: 1, minWidth: 200 }}
              placeholder="Titre (ex : Le grand cairn de l'été)" required
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <input
            className="pd-input" placeholder="Description (facultatif)"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              className="pd-input" style={{ flex: 1, minWidth: 240 }}
              value={form.goalType} onChange={(e) => setForm({ ...form, goalType: e.target.value })}
            >
              {GOAL_TYPES.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
            {goal?.paramLabel && (
              <input
                className="pd-input" style={{ width: 200 }}
                placeholder={goal.paramHint || goal.paramLabel}
                value={form.goalParam}
                onChange={(e) => setForm({ ...form, goalParam: e.target.value })}
                title={goal.paramLabel}
              />
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={lbl}>
              Objectif
              <input className="pd-input" type="number" min={1} style={{ width: 120 }}
                value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} />
            </label>
            <label style={lbl}>
              Durée (heures)
              <input className="pd-input" type="number" min={1} style={{ width: 120 }}
                value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })} />
            </label>
          </div>

          <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>🎁 Récompense (pour tous)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={lbl}>
              Cailloux
              <input className="pd-input" type="number" min={0} style={{ width: 110 }}
                value={form.rewardCredits} onChange={(e) => setForm({ ...form, rewardCredits: Number(e.target.value) })} />
            </label>
            <label style={lbl}>
              XP
              <input className="pd-input" type="number" min={0} style={{ width: 110 }}
                value={form.rewardXp} onChange={(e) => setForm({ ...form, rewardXp: Number(e.target.value) })} />
            </label>
            <label style={{ ...lbl, flex: 1, minWidth: 220 }}>
              Items (ex : bomb:2,shield:1)
              <input className="pd-input" placeholder="bomb:2,shield:1"
                value={form.rewardItems} onChange={(e) => setForm({ ...form, rewardItems: e.target.value })} />
            </label>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
            Items disponibles : {Object.keys(ITEM_LABELS).filter((k) => !k.startsWith("badge_") && !k.startsWith("title_") && !k.startsWith("name_")).join(", ")}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="pd-btn pd-btn-primary" type="submit">
              {editing ? "Enregistrer" : "Créer la quête"}
            </button>
            {editing && (
              <button type="button" className="pd-btn" onClick={() => { setEditing(null); setForm({ ...EMPTY }); }}>
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      <div className="pd-panel" style={{ overflow: "hidden" }}>
        {quests.length === 0 ? (
          <div style={{ padding: 16, color: "var(--muted)", fontSize: 14 }}>Aucune quête créée.</div>
        ) : (
          quests.map((q, i) => {
            const t = timeLeft(q.endAt);
            const pct = q.target > 0 ? Math.min(100, (q.progress / q.target) * 100) : 0;
            return (
              <div key={q.id} style={{ padding: 12, borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 22 }}>{q.emoji}</span>
                  <strong style={{ flex: 1, minWidth: 140 }}>{q.title}</strong>
                  <span style={{ fontSize: 12, fontWeight: 700, color: q.status === "success" ? "#2f6440" : q.status === "failed" ? "#c2261a" : "var(--muted)" }}>
                    {q.status === "success" ? "✅ réussie" : q.status === "failed" ? "❌ échouée" : `⏳ ${t.text}`}
                  </span>
                </div>
                <div style={{ marginTop: 6, height: 8, borderRadius: 999, background: "var(--panel-2)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,var(--accent),var(--accent-2))" }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  {q.progress} / {q.target} · 🎁 {rewardLabel(q)}
                  {q.distributedAt && " · récompense distribuée"}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <button className="pd-btn pd-mini" onClick={() => startEdit(q)}>✏️ Modifier</button>
                  <button className="pd-btn pd-mini" onClick={() => {
                    const v = prompt("Nouvelle progression :", String(q.progress));
                    if (v != null) send("PATCH", { id: q.id, progress: parseInt(v, 10) || 0 });
                  }}>📊 Progression</button>
                  <button className="pd-btn pd-mini" onClick={() => {
                    if (confirm("Forcer la réussite ? La récompense sera distribuée à TOUS les joueurs.")) {
                      send("PATCH", { id: q.id, action: "complete" });
                    }
                  }}>🎁 Forcer la réussite</button>
                  <button className="pd-btn pd-mini" onClick={() => send("PATCH", { id: q.id, action: "reset" })}>♻️ Réinitialiser</button>
                  <button className="pd-btn pd-mini" onClick={() => send("PATCH", { id: q.id, action: "cancel" })}>⏹️ Clore</button>
                  <button className="pd-btn pd-mini" style={{ borderColor: "#c2261a" }} onClick={() => {
                    if (confirm("Supprimer cette quête ?")) send("DELETE", { id: q.id });
                  }}>🗑️</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
};
