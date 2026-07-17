"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import {
  PRODUCTS,
  CATEGORY_LABELS,
  type Product,
  type ProductCategory,
} from "@/lib/products";

const EUR = (cts: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cts / 100);

export default function BoutiquePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [cat, setCat] = useState<ProductCategory>("pixels");
  const [pending, setPending] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setAuthed(!!d.authenticated);
        if (d.authenticated) {
          setCredits(d.credits);
          setUnlocks(d.unlocks || []);
          setInventory(d.inventory || {});
        }
      })
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

  const products = useMemo(() => PRODUCTS.filter((p) => p.category === cat), [cat]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Logo size={28} />
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {credits !== null && (
            <span className="pd-panel" style={{ padding: "8px 12px", fontSize: 14 }}>
              💰 <strong style={{ color: "var(--accent)" }}>{credits}</strong> cailloux
            </span>
          )}
          <Link href="/" className="pd-btn" style={{ textDecoration: "none" }}>← Carte</Link>
        </div>
      </div>

      <h1 style={{ margin: "8px 0 2px", fontSize: 28 }}>🛒 Boutique</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        {PRODUCTS.length} articles · paiement sécurisé Stripe · plus c'est gros, moins c'est cher.
      </p>

      {canceled && <div className="toast error" style={{ position: "static", transform: "none", margin: "12px 0" }}>Paiement annulé.</div>}
      {err && <div className="toast error" style={{ position: "static", transform: "none", margin: "12px 0" }}>{err}</div>}
      {authed === false && (
        <div className="pd-panel" style={{ padding: 16, margin: "12px 0" }}>
          Tu dois être connecté pour acheter.{" "}
          <Link href="/login" style={{ color: "var(--accent)" }}>Se connecter</Link> ·{" "}
          <Link href="/register" style={{ color: "var(--accent)" }}>Créer un compte</Link>
        </div>
      )}

      {/* Onglets catégories */}
      <div style={{ display: "flex", gap: 6, margin: "14px 0", flexWrap: "wrap" }}>
        {CATEGORY_LABELS.map((c) => (
          <button
            key={c.id}
            className="pd-btn"
            style={cat === c.id ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent) inset" } : {}}
            onClick={() => setCat(c.id)}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        {products.map((p) => (
          <Card
            key={p.sku}
            p={p}
            pending={pending === p.sku}
            disabled={!authed}
            owned={p.kind === "unlock" && !!p.itemSku && unlocks.includes(p.itemSku)}
            stock={p.kind === "item" && p.itemSku ? inventory[p.itemSku] || 0 : null}
            onBuy={() => buy(p.sku)}
          />
        ))}
      </div>

      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 22, textAlign: "center" }}>
        Les pierres rares (⭐🌈💎) se choisissent dans « Options » avant de poser un caillou. Les badges,
        titres et couleurs s'équipent depuis <Link href="/profil" style={{ color: "var(--accent)" }}>ton profil</Link>.
      </p>
    </div>
  );
}

function Card({
  p,
  pending,
  disabled,
  owned,
  stock,
  onBuy,
}: {
  p: Product;
  pending: boolean;
  disabled: boolean;
  owned: boolean;
  stock: number | null;
  onBuy: () => void;
}) {
  return (
    <div className="pd-panel" style={{ padding: 16, position: "relative", display: "flex", flexDirection: "column", gap: 6 }}>
      {p.highlight && (
        <div style={{ position: "absolute", top: -10, right: 10, background: "linear-gradient(135deg,var(--accent),var(--accent-2))", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
          POPULAIRE
        </div>
      )}
      <div style={{ fontSize: 32 }}>{p.emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.label}</div>
      <div style={{ color: "var(--muted)", fontSize: 12.5, flex: 1 }}>{p.description}</div>
      {stock !== null && stock > 0 && (
        <div style={{ fontSize: 11, color: "var(--accent)" }}>En stock : {stock}</div>
      )}
      <div style={{ fontSize: 19, fontWeight: 800 }}>{EUR(p.amountCts)}</div>
      {owned ? (
        <button className="pd-btn" disabled>✅ Possédé</button>
      ) : (
        <button className="pd-btn pd-btn-primary" disabled={disabled || pending} onClick={onBuy}>
          {pending ? "Redirection…" : "Acheter"}
        </button>
      )}
    </div>
  );
}
