"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<Record<string, unknown>>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => setProviders({}));
  }, []);

  const has = (id: string) => Object.prototype.hasOwnProperty.call(providers, id);
  const hasOAuth = has("google") || has("microsoft-entra-id") || has("apple");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setNotice("");
    const r = await fetch("/api/email-verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, purpose: "login" }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(data.error || "Email ou mot de passe incorrect.");
      return;
    }
    if (data.adminDirect) {
      setBusy(true);
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      setBusy(false);
      if (res?.error) {
        setErr("Identifiants admin incorrects.");
        return;
      }
      router.push("/admin");
      return;
    }
    setStep("code");
    setNotice(
      `Code envoyé à ${email}. Il expire dans ${data.expiresInMinutes || 10} minutes.`,
    );
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await signIn("credentials", {
      email,
      password,
      emailCode: code,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) setErr("Code invalide ou expiré.");
    else router.push("/");
  };

  const resendCode = async () => {
    setResending(true);
    setErr("");
    setNotice("");
    const r = await fetch("/api/email-verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, purpose: "login" }),
    });
    const data = await r.json().catch(() => ({}));
    setResending(false);
    if (!r.ok) {
      setErr(data.error || "Impossible de renvoyer le code.");
      return;
    }
    setNotice(
      `Nouveau code envoyé à ${email}. Il expire dans ${data.expiresInMinutes || 10} minutes.`,
    );
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="pd-panel" style={{ width: "min(94vw, 420px)", padding: 28 }}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit", display: "flex", justifyContent: "center" }}>
          <Logo size={34} />
        </Link>
        <p style={{ textAlign: "center", color: "var(--muted)", marginTop: 4, marginBottom: 22 }}>
          Connecte-toi et reçois 10 cailloux gratuits.
        </p>

        {/* Google mis en avant */}
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

        {hasOAuth && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", color: "var(--muted)", fontSize: 13 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            ou avec un email
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
        )}

        {notice && <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>{notice}</div>}

        {step === "code" ? (
          <form onSubmit={verifyCode} style={{ display: "grid", gap: 10 }}>
            <input
              className="pd-input"
              inputMode="numeric"
              pattern="[0-9]{6}"
              placeholder="Code à 6 chiffres"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
              required
            />
            {err && <div style={{ color: "#ff8ba0", fontSize: 13 }}>{err}</div>}
            <button className="pd-btn pd-btn-primary" type="submit" disabled={busy || code.length !== 6} style={{ width: "100%" }}>
              {busy ? "Vérification…" : "Valider le code"}
            </button>
            <button className="pd-btn" type="button" onClick={resendCode} disabled={resending} style={{ width: "100%" }}>
              {resending ? "Envoi…" : "Renvoyer le code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setCode("");
                setErr("");
                setNotice("");
              }}
              style={{ border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer", padding: 6 }}
            >
              Modifier mes identifiants
            </button>
          </form>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <input className="pd-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="pd-input" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {err && <div style={{ color: "#ff8ba0", fontSize: 13 }}>{err}</div>}
            <button className="pd-btn pd-btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Connexion…" : "Recevoir le code"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--muted)" }}>
          Pas de compte ? <Link href="/register" style={{ color: "var(--accent)" }}>Créer un compte</Link>
        </p>
      </div>
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
