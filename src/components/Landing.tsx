"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

const ERROR_LABELS: Record<string, string> = {
  Configuration:
    "Le serveur n'est pas encore configuré (base de données ou clés manquantes). Réessaie dans un instant.",
  OAuthAccountNotLinked:
    "Cet email est déjà utilisé avec une autre méthode de connexion.",
  AccessDenied: "Accès refusé (compte banni ?).",
  Verification: "Lien expiré, réessaie.",
};

export default function Landing() {
  const router = useRouter();
  const [providers, setProviders] = useState<Record<string, unknown>>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => setProviders({}));
    const p = new URLSearchParams(window.location.search);
    const e = p.get("error");
    if (e) setErr(ERROR_LABELS[e] || "Erreur de connexion.");
  }, []);

  const has = (id: string) => Object.prototype.hasOwnProperty.call(providers, id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) setErr("Email ou mot de passe incorrect (ou compte banni).");
    else router.push("/");
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: "1fr",
        placeItems: "center",
        padding: 20,
        background:
          "radial-gradient(1200px 600px at 20% -10%, rgba(107,140,255,0.25), transparent 60%)," +
          "radial-gradient(1000px 500px at 100% 100%, rgba(176,107,255,0.22), transparent 55%)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 32,
          gridTemplateColumns: "min(560px, 100%)",
          width: "min(1040px, 100%)",
          alignItems: "center",
        }}
        className="pd-landing-grid"
      >
        {/* Hero */}
        <div>
          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1 }}>
            🟦 PixelDrop
          </div>
          <p style={{ fontSize: 20, color: "var(--text)", marginTop: 14, marginBottom: 8, fontWeight: 600 }}>
            1 000 000 de pixels. Pose les tiens, dessine le monde.
          </p>
          <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 460 }}>
            Choisis ta couleur, place tes pixels sur une carte géante, attache un lien
            ou un message. Bombes, boucliers, pixels dorés… à toi de jouer.
          </p>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 18, display: "grid", gap: 8, color: "var(--text)" }}>
            <li>🎁 <strong>10 pixels offerts</strong> à l'inscription</li>
            <li>🎨 Palette immense + couleur personnalisée</li>
            <li>🔗 Lien ou message dans chaque pixel</li>
            <li>💣 Bombes, 🛡️ boucliers, ⭐ pixels dorés</li>
          </ul>
        </div>

        {/* Carte de connexion */}
        <div className="pd-panel" style={{ padding: 28, width: "100%", maxWidth: 420, justifySelf: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 20, textAlign: "center", marginBottom: 4 }}>
            Connecte-toi pour jouer
          </div>
          <p style={{ textAlign: "center", color: "var(--muted)", marginTop: 0, marginBottom: 20, fontSize: 14 }}>
            Gratuit — 10 pixels offerts.
          </p>

          {has("google") && (
            <button
              className="pd-btn pd-btn-google"
              style={{ width: "100%", padding: 14, fontSize: 16 }}
              onClick={() => signIn("google", { callbackUrl: "/" })}
            >
              <GoogleIcon /> Continuer avec Google
            </button>
          )}

          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {has("microsoft-entra-id") && (
              <button className="pd-btn" style={{ width: "100%" }} onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/" })}>
                <span>⊞</span> Continuer avec Microsoft
              </button>
            )}
            {has("apple") && (
              <button className="pd-btn" style={{ width: "100%", background: "#000", color: "#fff" }} onClick={() => signIn("apple", { callbackUrl: "/" })}>
                <span></span> Continuer avec Apple
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", color: "var(--muted)", fontSize: 13 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            ou avec un email
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <input className="pd-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="pd-input" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {err && <div style={{ color: "#ff8ba0", fontSize: 13 }}>{err}</div>}
            <button className="pd-btn pd-btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--muted)" }}>
            Pas de compte ? <Link href="/register" style={{ color: "var(--accent)" }}>Créer un compte</Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .pd-landing-grid { grid-template-columns: 1fr 420px !important; }
        }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
