"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Purchase = { label: string; status: string; result: string | null };

export default function SuccessPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [last, setLast] = useState<Purchase | null>(null);

  // Le webhook Stripe crédite en quelques secondes : on sonde jusqu'à "paid".
  useEffect(() => {
    let tries = 0;
    let stop = false;
    const poll = async () => {
      tries++;
      try {
        const [meR, pR] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/me/purchases", { cache: "no-store" }),
        ]);
        const me = await meR.json();
        if (me.authenticated) setCredits(me.credits);
        const pd = await pR.json();
        const latest = pd.purchases?.[0];
        if (latest) {
          setLast(latest);
          if (latest.status === "paid") stop = true;
        }
      } catch {
        /* ignore */
      }
      if (!stop && tries < 8) setTimeout(poll, 1500);
    };
    poll();
    return () => {
      stop = true;
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="pd-panel" style={{ padding: 32, textAlign: "center", width: "min(94vw, 440px)" }}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <h1 style={{ margin: "8px 0" }}>Merci pour ton achat !</h1>

        {last ? (
          <div style={{ margin: "10px 0", display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>{last.label}</div>
            {last.status === "paid" ? (
              <>
                {last.result && (
                  <div className="pd-panel" style={{ padding: 10, background: "var(--panel-2)", fontSize: 15 }}>
                    Tu as reçu : <strong>{last.result}</strong>
                  </div>
                )}
                <div style={{ color: "#37d67a", fontSize: 14 }}>✅ Crédité sur ton compte</div>
              </>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: 14 }}>
                ⏳ Validation en cours… (quelques secondes)
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "var(--muted)" }}>Validation du paiement en cours…</p>
        )}

        {credits !== null && (
          <p style={{ fontSize: 17 }}>
            Solde : <strong style={{ color: "var(--accent)" }}>{credits} pixels</strong>
          </p>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          <Link href="/" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
            🎨 Retour au canvas
          </Link>
          <Link href="/boutique" className="pd-btn" style={{ textDecoration: "none" }}>
            🛒 Boutique
          </Link>
        </div>
      </div>
    </div>
  );
}
