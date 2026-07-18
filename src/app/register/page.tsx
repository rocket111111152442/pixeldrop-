"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/Logo";

function strengthOf(pwd: string): { pct: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = [
    { pct: 8, label: "Trop court", color: "#ff5c7a" },
    { pct: 25, label: "Faible", color: "#ff8c5c" },
    { pct: 50, label: "Moyen", color: "#ffd23e" },
    { pct: 75, label: "Bon", color: "#8ee05c" },
    { pct: 100, label: "Excellent", color: "#37d67a" },
    { pct: 100, label: "Excellent", color: "#37d67a" },
  ];
  return levels[score];
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState(params.get("ref") || "");
  const [website, setWebsite] = useState(""); // honeypot anti-bot
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<Record<string, unknown>>({});

  // On n'affiche un bouton OAuth que si le provider est réellement configuré.
  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => setProviders({}));
  }, []);
  const hasGoogle = Object.prototype.hasOwnProperty.call(providers, "google");

  const strength = strengthOf(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo, email, password, referral, website, acceptTerms }),
    });
    const data = await r.json();
    if (!r.ok) {
      setErr(data.error || "Erreur.");
      setBusy(false);
      return;
    }
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) router.push("/login");
    else router.push("/");
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="pd-panel" style={{ width: "min(94vw, 420px)", padding: 28 }}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit", display: "flex", justifyContent: "center" }}>
          <Logo size={34} />
        </Link>
        <p style={{ textAlign: "center", color: "var(--muted)", marginTop: 4, marginBottom: 22 }}>
          Crée ton compte — 10 cailloux offerts{referral ? " (+5 avec le parrainage 🎁)" : ""}.
        </p>

        {hasGoogle && (
          <>
            <button className="pd-btn pd-btn-google" style={{ width: "100%", padding: 14 }} onClick={() => signIn("google", { callbackUrl: "/" })}>
              Continuer avec Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", color: "var(--muted)", fontSize: 13 }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              ou
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
          </>
        )}

        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <input className="pd-input" placeholder="Pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} minLength={3} maxLength={20} required />
          <input className="pd-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div>
            <input className="pd-input" type="password" placeholder="Mot de passe (8+ caractères)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            {password && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 5, borderRadius: 999, background: "var(--panel-2)", overflow: "hidden" }}>
                  <div style={{ width: `${strength.pct}%`, height: "100%", background: strength.color, transition: "width 0.2s" }} />
                </div>
                <div style={{ fontSize: 11, color: strength.color, marginTop: 3 }}>{strength.label}</div>
              </div>
            )}
          </div>
          <input className="pd-input" placeholder="Code parrain (optionnel)" value={referral} onChange={(e) => setReferral(e.target.value)} maxLength={20} />
          {/* Honeypot invisible : les bots le remplissent, pas les humains. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
            aria-hidden="true"
          />
          {/* Acceptation obligatoire des conditions */}
          <label
            style={{
              display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13,
              lineHeight: 1.45, background: "var(--panel-2)", padding: "10px 12px",
              borderRadius: 10, border: `1px solid ${acceptTerms ? "var(--accent)" : "var(--border)"}`,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              required
              style={{ marginTop: 2, width: 17, height: 17, flexShrink: 0 }}
            />
            <span>
              J&apos;ai lu et j&apos;accepte les{" "}
              <Link href="/conditions" target="_blank" style={{ color: "var(--accent)", fontWeight: 600 }}>
                conditions générales d&apos;utilisation et de vente
              </Link>
              . Je reconnais que les cailloux et objets achetés sont des contenus
              numériques sans valeur monétaire, non remboursables.
            </span>
          </label>

          {err && <div style={{ color: "#ff8ba0", fontSize: 13 }}>{err}</div>}
          <button
            className="pd-btn pd-btn-primary"
            type="submit"
            disabled={busy || !acceptTerms}
            style={{ width: "100%" }}
            title={!acceptTerms ? "Tu dois accepter les conditions pour créer ton compte" : undefined}
          >
            {busy ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--muted)" }}>
          Déjà inscrit ? <Link href="/login" style={{ color: "var(--accent)" }}>Se connecter</Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 6, fontSize: 13 }}>
          <Link href="/carte" style={{ color: "var(--muted)" }}>👀 Voir la carte sans compte</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
