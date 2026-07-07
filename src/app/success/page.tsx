"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SuccessPage() {
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const d = await r.json();
        if (d.authenticated) setCredits(d.credits);
      } catch {
        /* ignore */
      }
      if (tries < 6) setTimeout(poll, 1500);
    };
    poll();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="pd-panel" style={{ padding: 32, textAlign: "center", width: "min(94vw, 420px)" }}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <h1 style={{ margin: "8px 0" }}>Merci pour ton achat !</h1>
        <p style={{ color: "var(--muted)" }}>
          Ton achat a été validé. Les pixels et items sont crédités automatiquement
          (cela peut prendre quelques secondes).
        </p>
        {credits !== null && (
          <p style={{ fontSize: 18 }}>
            Solde actuel : <strong style={{ color: "var(--accent)" }}>{credits} pixels</strong>
          </p>
        )}
        <Link href="/" className="pd-btn pd-btn-primary" style={{ textDecoration: "none", marginTop: 8 }}>
          Retour au canvas
        </Link>
      </div>
    </div>
  );
}
