"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Purchase = {
  id: string;
  label: string;
  status: string;
  result: string | null;
  creditsGranted?: number | null;
};

const creditFormatter = new Intl.NumberFormat("fr-FR");
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function SuccessPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [last, setLast] = useState<Purchase | null>(null);
  const [animatedCredits, setAnimatedCredits] = useState<number | null>(null);
  const [animationDone, setAnimationDone] = useState(false);

  // Le webhook Stripe crédite en quelques secondes : on sonde jusqu'à "paid".
  useEffect(() => {
    let tries = 0;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    const purchasesUrl = sessionId
      ? `/api/me/purchases?session_id=${encodeURIComponent(sessionId)}`
      : "/api/me/purchases";

    const poll = async () => {
      tries++;
      try {
        const [meR, pR] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }),
          fetch(purchasesUrl, { cache: "no-store" }),
        ]);
        const me = await meR.json();
        if (me.authenticated) setCredits(me.credits);
        const pd = await pR.json();
        const latest = pd.purchases?.[0];
        if (latest) {
          setLast(latest);
          if (latest.status === "paid" && me.authenticated) stop = true;
        }
      } catch {
        /* ignore */
      }
      if (!stop && tries < 10) timer = setTimeout(poll, 1500);
    };

    poll();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const creditsGranted = Math.max(0, last?.creditsGranted ?? 0);
  const shouldAnimateCredits = last?.status === "paid" && credits !== null && creditsGranted > 0;
  const finalCredits = credits ?? 0;
  const startCredits = Math.max(0, finalCredits - creditsGranted);

  useEffect(() => {
    if (!shouldAnimateCredits) return;

    let frame = 0;
    let revealTimer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = performance.now();
    const duration = Math.min(4300, Math.max(1500, 900 + Math.log10(creditsGranted + 1) * 900));

    setAnimationDone(false);
    setAnimatedCredits(startCredits);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = easeOutCubic(progress);
      const value = Math.round(startCredits + (finalCredits - startCredits) * eased);
      setAnimatedCredits(value);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setAnimatedCredits(finalCredits);
        revealTimer = setTimeout(() => setAnimationDone(true), 650);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [creditsGranted, finalCredits, last?.id, shouldAnimateCredits, startCredits]);

  const shownCredits = shouldAnimateCredits ? animatedCredits ?? startCredits : credits;
  const formattedCredits = useMemo(
    () => creditFormatter.format(shownCredits ?? 0),
    [shownCredits],
  );

  if (shouldAnimateCredits) {
    return (
      <main className="pd-credit-animation" aria-live="polite">
        <div className="pd-credit-animation-inner">
          <div className="pd-credit-animation-number" aria-label={`${formattedCredits} cailloux`}>
            {formattedCredits}
          </div>
          {animationDone && (
            <div className="pd-credit-animation-actions">
              <Link href="/" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
                🎨 Retour au canvas
              </Link>
              <Link href="/boutique" className="pd-btn" style={{ textDecoration: "none" }}>
                🛒 Boutique
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

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
            Solde : <strong style={{ color: "var(--accent)" }}>{credits} cailloux</strong>
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
