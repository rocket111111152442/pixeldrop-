"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { PALETTE } from "@/lib/canvas-config";
import { PRODUCTS } from "@/lib/products";

const ERROR_LABELS: Record<string, string> = {
  Configuration:
    "Le serveur n'est pas encore prêt (base ou clés manquantes). Réessaie dans un instant.",
  OAuthAccountNotLinked:
    "Cet email est déjà utilisé avec une autre méthode de connexion.",
  AccessDenied: "Accès refusé (compte banni ?).",
  Verification: "Lien expiré, réessaie.",
};

const EUR = (cts: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cts / 100);

export default function Landing() {
  // Pixels décoratifs animés en fond.
  const deco = useMemo(
    () =>
      Array.from({ length: 160 }, () => ({
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        delay: (Math.random() * 6).toFixed(2),
        dur: (2.5 + Math.random() * 4).toFixed(2),
        op: (0.25 + Math.random() * 0.5).toFixed(2),
      })),
    [],
  );

  const packs = PRODUCTS.filter((p) => p.kind === "credits");
  const items = PRODUCTS.filter((p) => p.kind === "item");

  return (
    <div className="pd-land">
      {/* Fond animé */}
      <div className="pd-deco" aria-hidden>
        {deco.map((d, i) => (
          <span
            key={i}
            style={{
              background: d.color,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.dur}s`,
              opacity: Number(d.op),
            }}
          />
        ))}
      </div>

      {/* Barre du haut */}
      <header className="pd-nav">
        <div className="pd-logo">🟦 PixelDrop</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/login" className="pd-btn" style={{ textDecoration: "none" }}>
            Se connecter
          </Link>
          <Link
            href="/register"
            className="pd-btn pd-btn-primary"
            style={{ textDecoration: "none" }}
          >
            Créer un compte
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="pd-hero">
        <div className="pd-hero-left">
          <div className="pd-badge">🎁 10 pixels offerts à l'inscription</div>
          <h1 className="pd-title">
            Un million de pixels.
            <br />
            <span className="pd-grad">Le tien commence ici.</span>
          </h1>
          <p className="pd-sub">
            Achète, place et personnalise tes pixels sur une carte géante partagée
            en temps réel. Attache un lien ou un message, défends ton territoire
            avec des bombes et des boucliers.
          </p>

          <div className="pd-hero-cta">
            <Link href="/register" className="pd-btn pd-btn-primary pd-btn-lg" style={{ textDecoration: "none" }}>
              🚀 Créer mon compte gratuit
            </Link>
            <a href="#comment" className="pd-btn pd-btn-lg" style={{ textDecoration: "none" }}>
              Comment ça marche ?
            </a>
          </div>

          <div className="pd-stats">
            <div>
              <strong>1 000 000</strong>
              <span>pixels à conquérir</span>
            </div>
            <div>
              <strong>10</strong>
              <span>pixels offerts</span>
            </div>
            <div>
              <strong>dès 0,06 €</strong>
              <span>le pixel</span>
            </div>
          </div>
        </div>

        {/* Carte de connexion / inscription */}
        <div className="pd-hero-right">
          <SignInCard />
        </div>
      </section>

      {/* FEATURES */}
      <section className="pd-section">
        <h2 className="pd-h2">Pourquoi tu vas adorer</h2>
        <div className="pd-cards">
          <Feature emoji="🎨" title="Palette immense">
            Des dizaines de couleurs prêtes à l'emploi, plus un sélecteur de couleur
            personnalisée pour un rendu exact.
          </Feature>
          <Feature emoji="🔒" title="Ton pixel est à toi">
            Une fois posé, personne ne peut l'écraser. Ton œuvre reste intacte,
            garantie.
          </Feature>
          <Feature emoji="🔗" title="Liens & messages">
            Cache un lien ou un petit mot dans chaque pixel. Les autres le découvrent
            en cliquant dessus.
          </Feature>
          <Feature emoji="💣" title="Bombes & attaques">
            Détruis les pixels adverses à la bombe ou à la méga-bombe (zone 3×3) pour
            reprendre du terrain.
          </Feature>
          <Feature emoji="🛡️" title="Boucliers">
            Protège tes plus beaux pixels : un pixel sous bouclier résiste aux bombes.
          </Feature>
          <Feature emoji="⭐" title="Pixels dorés">
            Fais briller tes créations avec des pixels dorés animés qui sortent du lot.
          </Feature>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="pd-section" id="comment">
        <h2 className="pd-h2">3 étapes, c'est parti</h2>
        <div className="pd-steps">
          <Step n={1} title="Crée ton compte">
            Inscription en 10 secondes (Google ou email). Tu reçois <strong>10 pixels
            gratuits</strong> immédiatement.
          </Step>
          <Step n={2} title="Place tes pixels">
            Choisis ta couleur, zoome sur la carte et clique pour poser. Ajoute un lien
            ou un message si tu veux.
          </Step>
          <Step n={3} title="Agrandis ton empire">
            À court de pixels ? Achète un pack, lance des bombes, pose des pixels dorés
            et domine la carte.
          </Step>
        </div>
        <div style={{ textAlign: "center", marginTop: 26 }}>
          <Link href="/register" className="pd-btn pd-btn-primary pd-btn-lg" style={{ textDecoration: "none" }}>
            Je commence maintenant →
          </Link>
        </div>
      </section>

      {/* ITEMS */}
      <section className="pd-section">
        <h2 className="pd-h2">Des items pour prendre l'avantage</h2>
        <div className="pd-cards pd-cards-4">
          {items.map((it) => (
            <div key={it.sku} className="pd-card pd-card-item">
              <div className="pd-item-emoji">{it.emoji}</div>
              <div style={{ fontWeight: 700 }}>{it.label}</div>
              <div style={{ color: "var(--muted)", fontSize: 13, flex: 1 }}>{it.description}</div>
              <div className="pd-price">{EUR(it.amountCts)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="pd-section">
        <h2 className="pd-h2">Des packs pour tous les budgets</h2>
        <p className="pd-h2-sub">Plus tu prends gros, moins le pixel coûte cher.</p>
        <div className="pd-cards pd-cards-5">
          {packs.map((p) => (
            <div key={p.sku} className={`pd-card pd-pack${p.highlight ? " pd-pack-hot" : ""}`}>
              {p.highlight && <div className="pd-hot">POPULAIRE</div>}
              <div className="pd-item-emoji">{p.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{p.credits} pixels</div>
              <div style={{ color: "var(--muted)", fontSize: 12, flex: 1 }}>{p.description}</div>
              <div className="pd-price">{EUR(p.amountCts)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="pd-final">
        <h2 className="pd-h2" style={{ marginBottom: 8 }}>Prêt à laisser ta marque ?</h2>
        <p className="pd-sub" style={{ margin: "0 auto 22px", maxWidth: 520 }}>
          Rejoins PixelDrop, récupère tes 10 pixels offerts et commence à dessiner
          sur la plus grande toile partagée.
        </p>
        <Link href="/register" className="pd-btn pd-btn-primary pd-btn-lg" style={{ textDecoration: "none" }}>
          🎨 Créer mon compte gratuit
        </Link>
        <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 14 }}>
          Déjà inscrit ? <Link href="/login" style={{ color: "var(--accent)" }}>Se connecter</Link>
        </div>
      </section>

      <footer className="pd-foot">
        🟦 PixelDrop — pose ton pixel, raconte ton histoire.
      </footer>

      <LandingStyles />
    </div>
  );
}

function Feature({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="pd-card pd-feature">
      <div className="pd-feature-emoji">{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{title}</div>
      <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="pd-card pd-step">
      <div className="pd-step-n">{n}</div>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{title}</div>
      <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function SignInCard() {
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
    <div className="pd-panel pd-signin" id="inscription">
      <div style={{ fontWeight: 800, fontSize: 20, textAlign: "center" }}>
        Rejoins la partie
      </div>
      <p style={{ textAlign: "center", color: "var(--muted)", marginTop: 4, marginBottom: 18, fontSize: 14 }}>
        Gratuit · 10 pixels offerts
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
      {has("microsoft-entra-id") && (
        <button className="pd-btn" style={{ width: "100%", marginTop: 8 }} onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/" })}>
          ⊞ Continuer avec Microsoft
        </button>
      )}
      {has("apple") && (
        <button className="pd-btn" style={{ width: "100%", marginTop: 8, background: "#000", color: "#fff" }} onClick={() => signIn("apple", { callbackUrl: "/" })}>
           Continuer avec Apple
        </button>
      )}

      <div className="pd-or">
        <span />ou avec un email<span />
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input className="pd-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="pd-input" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <div style={{ color: "#ff8ba0", fontSize: 13 }}>{err}</div>}
        <button className="pd-btn pd-btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <Link href="/register" className="pd-btn" style={{ width: "100%", marginTop: 10, textDecoration: "none" }}>
        ✨ Créer un nouveau compte
      </Link>
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

function LandingStyles() {
  return (
    <style>{`
      .pd-land { position: relative; min-height: 100dvh; overflow-x: hidden;
        background:
          radial-gradient(1200px 600px at 15% -10%, rgba(107,140,255,0.22), transparent 60%),
          radial-gradient(1000px 500px at 100% 10%, rgba(176,107,255,0.20), transparent 55%),
          var(--bg);
      }
      .pd-deco { position: fixed; inset: 0; z-index: 0; pointer-events: none;
        display: grid; grid-template-columns: repeat(20, 1fr); grid-auto-rows: 5vh;
        gap: 6px; padding: 10px; filter: blur(0.3px); }
      .pd-deco span { border-radius: 3px; animation: pdPulse 4s ease-in-out infinite; }
      @keyframes pdPulse { 0%,100% { transform: scale(0.5); opacity: 0.15; } 50% { transform: scale(1); } }

      .pd-nav, .pd-hero, .pd-section, .pd-final { position: relative; z-index: 1; }
      .pd-nav { display: flex; justify-content: space-between; align-items: center;
        padding: 16px clamp(16px, 5vw, 48px); }
      .pd-logo { font-weight: 900; font-size: 20px; }

      .pd-hero { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: center;
        padding: clamp(24px, 6vw, 70px) clamp(16px, 5vw, 48px); max-width: 1160px; margin: 0 auto; }
      @media (min-width: 940px) { .pd-hero { grid-template-columns: 1.15fr 0.85fr; } }
      .pd-badge { display: inline-block; padding: 7px 14px; border-radius: 999px;
        background: rgba(107,140,255,0.15); border: 1px solid var(--border);
        font-size: 13px; font-weight: 600; margin-bottom: 18px; }
      .pd-title { font-size: clamp(34px, 6vw, 60px); line-height: 1.03; font-weight: 900;
        letter-spacing: -1.5px; margin: 0 0 16px; }
      .pd-grad { background: linear-gradient(100deg, var(--accent), var(--accent-2) 60%, #ff8bd0);
        -webkit-background-clip: text; background-clip: text; color: transparent;
        background-size: 200% auto; animation: pdGrad 5s linear infinite; }
      @keyframes pdGrad { to { background-position: 200% center; } }
      .pd-sub { color: var(--muted); font-size: clamp(15px, 2vw, 18px); line-height: 1.6;
        max-width: 520px; margin: 0 0 26px; }
      .pd-hero-cta { display: flex; flex-wrap: wrap; gap: 12px; }
      .pd-btn-lg { padding: 14px 22px; font-size: 16px; }
      .pd-stats { display: flex; flex-wrap: wrap; gap: 26px; margin-top: 32px; }
      .pd-stats > div { display: flex; flex-direction: column; }
      .pd-stats strong { font-size: 24px; font-weight: 900; }
      .pd-stats span { color: var(--muted); font-size: 13px; }

      .pd-signin { padding: 26px; animation: pdRise 0.6s ease both; }
      @keyframes pdRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
      .pd-or { display: flex; align-items: center; gap: 10px; margin: 18px 0;
        color: var(--muted); font-size: 13px; }
      .pd-or span { flex: 1; height: 1px; background: var(--border); }

      .pd-section { max-width: 1100px; margin: 0 auto; padding: clamp(28px, 5vw, 56px) clamp(16px, 5vw, 48px); }
      .pd-h2 { font-size: clamp(24px, 4vw, 36px); font-weight: 900; text-align: center; margin: 0 0 6px; letter-spacing: -0.5px; }
      .pd-h2-sub { text-align: center; color: var(--muted); margin: 0 0 26px; }
      .pd-h2 + .pd-cards, .pd-h2 + .pd-steps { margin-top: 26px; }

      .pd-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
      .pd-cards-4 { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
      .pd-cards-5 { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
      .pd-card { background: var(--panel); border: 1px solid var(--border); border-radius: 16px;
        padding: 20px; transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        display: flex; flex-direction: column; gap: 6px; position: relative; }
      .pd-card:hover { transform: translateY(-4px); border-color: var(--accent);
        box-shadow: 0 12px 30px rgba(0,0,0,0.35); }
      .pd-feature-emoji { font-size: 30px; margin-bottom: 6px; }
      .pd-item-emoji { font-size: 34px; }
      .pd-price { font-size: 20px; font-weight: 800; margin-top: 4px; }

      .pd-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
      .pd-step-n { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
        font-weight: 900; font-size: 20px; margin-bottom: 8px;
        background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #fff; }

      .pd-pack { align-items: flex-start; }
      .pd-pack-hot { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
      .pd-hot { position: absolute; top: -10px; right: 12px; font-size: 10px; font-weight: 800;
        padding: 3px 9px; border-radius: 999px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); }

      .pd-final { max-width: 720px; margin: 0 auto; text-align: center;
        padding: clamp(30px, 6vw, 64px) 20px; }
      .pd-foot { position: relative; z-index: 1; text-align: center; color: var(--muted);
        padding: 30px 20px 40px; border-top: 1px solid var(--border); margin-top: 20px; }
    `}</style>
  );
}
