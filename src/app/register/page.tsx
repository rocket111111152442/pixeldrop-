"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo, email, password }),
    });
    const data = await r.json();
    if (!r.ok) {
      setErr(data.error || "Erreur.");
      setBusy(false);
      return;
    }
    // Connexion automatique après inscription.
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
          Crée ton compte — 10 pixels offerts.
        </p>

        <button className="pd-btn pd-btn-google" style={{ width: "100%", padding: 14 }} onClick={() => signIn("google", { callbackUrl: "/" })}>
          Continuer avec Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", color: "var(--muted)", fontSize: 13 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          ou
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <input className="pd-input" placeholder="Pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} minLength={3} maxLength={20} required />
          <input className="pd-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="pd-input" type="password" placeholder="Mot de passe (6+ caractères)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          {err && <div style={{ color: "#ff8ba0", fontSize: 13 }}>{err}</div>}
          <button className="pd-btn pd-btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--muted)" }}>
          Déjà inscrit ? <Link href="/login" style={{ color: "var(--accent)" }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
