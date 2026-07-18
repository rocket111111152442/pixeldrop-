"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/Logo";

type Props = {
  reason: string;
  category: string | null;
  severity: string | null;
  bannedAt: string | null;
  expiresAt: string | null;
  appealDeadline: string | null;
  appealStatus: string;
  appealText: string | null;
  deleteAfter: string | null;
};

function fmt(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("fr-FR");
}

export default function BannedClient({
  reason,
  category,
  severity,
  bannedAt,
  expiresAt,
  appealDeadline,
  appealStatus,
  appealText,
  deleteAfter,
}: Props) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const canAppeal =
    appealStatus !== "pending" &&
    (!appealDeadline || new Date(appealDeadline).getTime() > Date.now());

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/ban/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(d.error || "Contestation impossible.");
      else {
        setText("");
        setMsg("Contestation envoyée. Elle est visible dans l'administration.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <section className="pd-panel" style={{ width: "min(94vw, 640px)", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <Logo size={34} />
        </div>
        <h1 style={{ margin: "0 0 8px", color: "#ffb3c1", textAlign: "center" }}>
          Compte banni
        </h1>
        <p style={{ color: "var(--muted)", textAlign: "center", marginTop: 0 }}>
          Ton compte est bloqué par la modération de PebbleDrop.
        </p>

        <div style={{ display: "grid", gap: 8, margin: "18px 0", fontSize: 14 }}>
          <div><strong>Raison :</strong> {reason}</div>
          {category && <div><strong>Catégorie :</strong> {category}</div>}
          {severity && (
            <div>
              <strong>Sanction :</strong>{" "}
              {severity === "permanent_ban" ? "définitive" : "temporaire"}
            </div>
          )}
          {bannedAt && <div><strong>Date :</strong> {fmt(bannedAt)}</div>}
          {expiresAt && <div><strong>Fin prévue :</strong> {fmt(expiresAt)}</div>}
          {appealDeadline && <div><strong>Délai de contestation :</strong> {fmt(appealDeadline)}</div>}
          {deleteAfter && (
            <div style={{ color: "#ffb3c1" }}>
              Sans contestation avant ce délai, le compte pourra être supprimé automatiquement.
            </div>
          )}
          {appealStatus === "pending" && (
            <div style={{ color: "var(--accent)" }}>
              Contestation en attente : {appealText || "envoyée"}.
            </div>
          )}
        </div>

        {canAppeal ? (
          <form onSubmit={send} style={{ display: "grid", gap: 10 }}>
            <textarea
              className="pd-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Explique pourquoi tu contestes la sanction..."
              minLength={20}
              maxLength={1200}
              rows={5}
              required
              style={{ resize: "vertical" }}
            />
            <button className="pd-btn pd-btn-primary" disabled={busy || text.trim().length < 20}>
              {busy ? "Envoi..." : "Contester la sanction"}
            </button>
          </form>
        ) : (
          <div className="pd-panel" style={{ padding: 12, background: "var(--panel-2)", color: "var(--muted)", fontSize: 14 }}>
            {appealStatus === "pending"
              ? "Ta contestation est déjà transmise aux administrateurs."
              : "Le délai de contestation est terminé."}
          </div>
        )}

        {msg && <div style={{ marginTop: 12, color: msg.includes("envoy") ? "var(--accent)" : "#ff8ba0" }}>{msg}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
          <button className="pd-btn" onClick={() => signOut({ callbackUrl: "/" })}>
            Se déconnecter
          </button>
          <Link href="/conditions" className="pd-btn" style={{ textDecoration: "none" }}>
            Conditions générales
          </Link>
        </div>
      </section>
    </main>
  );
}
