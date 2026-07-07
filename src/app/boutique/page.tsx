"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PRODUCTS, type Product } from "@/lib/products";

const CHF = (cts: number) => (cts / 100).toFixed(2) + " CHF";

export default function BoutiquePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authenticated))
      .catch(() => setAuthed(false));
    const p = new URLSearchParams(window.location.search);
    if (p.get("canceled")) setCanceled(true);
  }, []);

  const buy = async (sku: string) => {
    setErr("");
    setPending(sku);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const data = await r.json();
      if (!r.ok || !data.url) {
        setErr(data.error || "Paiement indisponible.");
        setPending(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setErr("Erreur réseau.");
      setPending(null);
    }
  };

  const packs = PRODUCTS.filter((p) => p.kind === "credits");
  const items = PRODUCTS.filter((p) => p.kind === "item");

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>🛒 Boutique</h1>
        <Link href="/" className="pd-btn" style={{ textDecoration: "none" }}>← Retour au canvas</Link>
      </div>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Plus tu prends gros, moins le pixel coûte cher. Paiement sécurisé via Stripe.
      </p>

      {canceled && <div className="toast error" style={{ position: "static", transform: "none", margin: "12px 0" }}>Paiement annulé.</div>}
      {err && <div className="toast error" style={{ position: "static", transform: "none", margin: "12px 0" }}>{err}</div>}
      {authed === false && (
        <div className="pd-panel" style={{ padding: 16, marginBottom: 16 }}>
          Tu dois être connecté pour acheter. <Link href="/login" style={{ color: "var(--accent)" }}>Se connecter</Link>
        </div>
      )}

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Packs de pixels</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {packs.map((p) => (
          <Card key={p.sku} p={p} pending={pending === p.sku} disabled={!authed} onBuy={() => buy(p.sku)} />
        ))}
      </div>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Items & power-ups</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {items.map((p) => (
          <Card key={p.sku} p={p} pending={pending === p.sku} disabled={!authed} onBuy={() => buy(p.sku)} />
        ))}
      </div>
    </div>
  );
}

function Card({ p, pending, disabled, onBuy }: { p: Product; pending: boolean; disabled: boolean; onBuy: () => void }) {
  return (
    <div className="pd-panel" style={{ padding: 16, position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
      {p.highlight && (
        <div style={{ position: "absolute", top: -10, right: 10, background: "linear-gradient(135deg,var(--accent),var(--accent-2))", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
          POPULAIRE
        </div>
      )}
      <div style={{ fontSize: 34 }}>{p.emoji}</div>
      <div style={{ fontWeight: 700 }}>{p.label}</div>
      <div style={{ color: "var(--muted)", fontSize: 13, flex: 1 }}>{p.description}</div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{CHF(p.amountCts)}</div>
      <button className="pd-btn pd-btn-primary" disabled={disabled || pending} onClick={onBuy}>
        {pending ? "Redirection…" : "Acheter"}
      </button>
    </div>
  );
}
