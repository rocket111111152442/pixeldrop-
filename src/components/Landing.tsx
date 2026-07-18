"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { PRODUCTS } from "@/lib/products";
import { Logo, LogoMark } from "@/components/Logo";
import ForestScene from "@/components/ForestScene";

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

// Nuances de cailloux montrées dans le héros (clair → foncé).
const DEMO_STONES = [
  "#f5f3ee", "#d9d4ca", "#b3aca0", "#8a8175", "#615950", "#3a342e",
  "#ddc9a9", "#b39068", "#a3b3ba", "#67787f", "#a8bb92", "#5c7350",
];

export default function Landing() {
  const packs = PRODUCTS.filter((p) => p.kind === "credits").slice(0, 5);
  const items = PRODUCTS.filter((p) => p.kind === "item" && p.itemQty === 1).slice(0, 4);

  return (
    <div className="pd-land">
      <ForestScene />

      {/* ── Bandeau engagement caritatif ── */}
      <div className="pd-give-bar">
        <span className="pd-give-pill">
          ❤️ 5 % de chaque achat reversé à une association caritative
        </span>
      </div>

      {/* ── Barre du haut ── */}
      <header className="pd-nav">
        <Logo size={30} />
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/carte" className="pd-btn pd-hide-sm" style={{ textDecoration: "none" }}>
            🗺️ La carte
          </Link>
          <Link href="/login" className="pd-btn" style={{ textDecoration: "none" }}>
            Se connecter
          </Link>
          <Link href="/register" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
            Créer un compte
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pd-hero">
        <div className="pd-hero-left">
          <div className="pd-badge">🎁 10 cailloux offerts à l&apos;inscription</div>
          <h1 className="pd-title">
            Un million de cailloux.
            <br />
            <span className="pd-grad">Laisse ta trace dans la clairière.</span>
          </h1>
          <p className="pd-sub">
            Une immense clairière partagée que tout le monde construit ensemble,
            caillou par caillou. Choisis ta pierre, pose-la, grave un message ou
            un lien dessous — et regarde l&apos;œuvre collective grandir en direct.
          </p>

          {/* Nuancier de cailloux */}
          <div className="pd-stone-row">
            {DEMO_STONES.map((c, i) => (
              <span
                key={c}
                className="pd-stone-demo"
                style={{ background: c, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>

          <div className="pd-hero-cta">
            <Link href="/register" className="pd-btn pd-btn-primary pd-btn-lg" style={{ textDecoration: "none" }}>
              🪨 Créer mon compte gratuit
            </Link>
            <Link href="/carte" className="pd-btn pd-btn-lg" style={{ textDecoration: "none" }}>
              🗺️ Voir la clairière sans compte
            </Link>
          </div>

          <div className="pd-stats">
            <div>
              <strong>1 000 000</strong>
              <span>cailloux à poser</span>
            </div>
            <div>
              <strong>10</strong>
              <span>offerts, sans payer</span>
            </div>
            <div>
              <strong>5 %</strong>
              <span>reversés à une association</span>
            </div>
          </div>
        </div>

        <div className="pd-hero-right">
          <SignInCard />
        </div>
      </section>

      {/* ── L'ŒUVRE COLLECTIVE : l'argument central ── */}
      <section className="pd-section">
        <div className="pd-highlight">
          <div className="pd-highlight-icon">🗿</div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900 }}>
              Une œuvre que personne ne peut faire seul
            </h2>
            <p style={{ margin: "0 0 12px", fontSize: 16, lineHeight: 1.6 }}>
              Chaque caillou posé reste. Le tien devient une pièce d&apos;une fresque
              construite par tous les joueurs, en direct. Personne ne peut
              l&apos;effacer : <strong>ce que tu poses t&apos;appartient pour de bon</strong>.
            </p>
            <ul className="pd-highlight-list">
              <li>🎯 Des <strong>quêtes collectives</strong> : un objectif commun, une récompense pour tout le monde</li>
              <li>💬 Un <strong>chat</strong> et des profils pour rencontrer les autres bâtisseurs</li>
              <li>🔗 <strong>Partage un endroit précis</strong> de la carte en un clic</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── ENGAGEMENT CARITATIF ── */}
      <section className="pd-section">
        <div className="pd-give">
          <div className="pd-give-icon">❤️</div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, color: "#17251c" }}>
              Jouer fait aussi du bien
            </h2>
            <p style={{ margin: "0 0 10px", fontSize: 16, lineHeight: 1.6, color: "#2e3f34" }}>
              <strong>5 % de chaque achat réalisé sur PebbleDrop est reversé à une
              association caritative.</strong> Une association est tirée au sort à chaque
              période, et le versement est effectué chaque trimestre.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              Tu achètes un contenu de jeu, tu ne fais pas un don : aucun reçu fiscal n&apos;est
              délivré. Les modalités complètes figurent à l&apos;article 12 des{" "}
              <Link href="/conditions" style={{ color: "var(--accent)", fontWeight: 600 }}>
                conditions générales
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="pd-section">
        <h2 className="pd-h2">Pourquoi tu vas adorer</h2>
        <p className="pd-h2-sub">Simple à prendre en main, difficile à lâcher.</p>
        <div className="pd-cards">
          <Feature emoji="🪨" title="Des cailloux, du clair au sombre">
            Plus de 30 nuances minérales : calcaire, grès, ardoise, granit, mousse et
            lichen. Du galet blanc au basalte presque noir.
          </Feature>
          <Feature emoji="🔒" title="Ton caillou est à toi">
            Une fois posé, personne ne peut le recouvrir. Ton cairn reste intact,
            garanti.
          </Feature>
          <Feature emoji="🗿" title="Grave un message">
            Cache un lien ou un mot sous chaque caillou. Les promeneurs le découvrent
            en cliquant dessus.
          </Feature>
          <Feature emoji="⛏️" title="Pioche & dynamite">
            Déloge les cailloux adverses à la pioche, à la masse (3×3) ou à la
            dynamite (5×5) pour reprendre du terrain.
          </Feature>
          <Feature emoji="🛡️" title="Cailloux protégés">
            Protège tes plus belles pierres : la mousse résiste aux pioches
            (mais pas à la masse…).
          </Feature>
          <Feature emoji="💎" title="Pierres précieuses">
            Pépites dorées, opales chatoyantes et diamants bruts : des cailloux
            animés qui brillent dans la clairière.
          </Feature>
        </div>
      </section>

      {/* ── ÉTAPES ── */}
      <section className="pd-section" id="comment">
        <h2 className="pd-h2">3 étapes, c&apos;est parti</h2>
        <div className="pd-steps">
          <Step n={1} title="Crée ton compte">
            Inscription en 10 secondes (Google ou email). Tu reçois <strong>10 cailloux
            gratuits</strong> immédiatement.
          </Step>
          <Step n={2} title="Pose tes cailloux">
            Choisis ta nuance de pierre, zoome sur la clairière et pose. Ajoute un
            message ou un lien si tu veux.
          </Step>
          <Step n={3} title="Agrandis ton cairn">
            Reviens chaque jour pour ta récompense, invite un ami (+5 cailloux pour
            vous deux) ou prends un sac.
          </Step>
        </div>
        <div style={{ textAlign: "center", marginTop: 26 }}>
          <Link href="/register" className="pd-btn pd-btn-primary pd-btn-lg" style={{ textDecoration: "none" }}>
            Je commence maintenant →
          </Link>
        </div>
      </section>

      {/* ── OUTILS ── */}
      <section className="pd-section">
        <h2 className="pd-h2">L&apos;équipement du carrier</h2>
        <div className="pd-cards pd-cards-4">
          {items.map((it) => (
            <div key={it.sku} className="pd-card">
              <div className="pd-item-emoji">{it.emoji}</div>
              <div style={{ fontWeight: 700 }}>{it.label}</div>
              <div style={{ color: "var(--muted)", fontSize: 13, flex: 1 }}>{it.description}</div>
              <div className="pd-price">{EUR(it.amountCts)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SACS DE CAILLOUX ── */}
      <section className="pd-section">
        <h2 className="pd-h2">Des sacs pour tous les budgets</h2>
        <p className="pd-h2-sub">
          Tu peux jouer sans jamais payer. Les sacs, c&apos;est juste pour aller plus vite.
        </p>
        <div className="pd-cards pd-cards-5">
          {packs.map((p) => (
            <div key={p.sku} className={`pd-card pd-pack${p.highlight ? " pd-pack-hot" : ""}`}>
              {p.highlight && <div className="pd-hot">POPULAIRE</div>}
              <div className="pd-item-emoji">{p.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{p.credits} cailloux</div>
              <div style={{ color: "var(--muted)", fontSize: 12, flex: 1 }}>{p.description}</div>
              <div className="pd-price">{EUR(p.amountCts)}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/boutique" className="pd-btn" style={{ textDecoration: "none" }}>
            Voir les {PRODUCTS.length} articles →
          </Link>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="pd-final">
        <LogoMark size={54} />
        <h2 className="pd-h2" style={{ marginTop: 12, marginBottom: 8 }}>
          Prêt à poser ta pierre ?
        </h2>
        <p className="pd-sub" style={{ margin: "0 auto 22px", maxWidth: 520 }}>
          Rejoins PebbleDrop, récupère tes 10 cailloux offerts et ajoute ta trace
          à la plus grande clairière partagée.
        </p>
        <div>
          <Link href="/register" className="pd-btn pd-btn-primary pd-btn-lg" style={{ textDecoration: "none" }}>
            🪨 Créer mon compte gratuit
          </Link>
        </div>
        <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 14 }}>
          Déjà inscrit ? <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Se connecter</Link>
        </div>
      </section>

      <footer className="pd-foot">
        <div>🪨 PebbleDrop — pose ton caillou, laisse ta trace.</div>
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <Link href="/conditions" style={{ color: "var(--accent)" }}>
            Conditions générales
          </Link>
          <span style={{ margin: "0 8px", opacity: 0.5 }}>·</span>
          <Link href="/carte" style={{ color: "var(--accent)" }}>
            La carte
          </Link>
        </div>
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
    <div className="pd-panel pd-signin">
      <div style={{ fontWeight: 800, fontSize: 20, textAlign: "center" }}>
        Rejoins la clairière
      </div>
      <p style={{ textAlign: "center", color: "var(--muted)", marginTop: 4, marginBottom: 18, fontSize: 14 }}>
        Gratuit · 10 cailloux offerts
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

      {(has("google") || has("microsoft-entra-id") || has("apple")) && (
        <div className="pd-or">
          <span />ou avec un email<span />
        </div>
      )}

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input className="pd-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="pd-input" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <div style={{ color: "#c2261a", fontSize: 13 }}>{err}</div>}
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
      .pd-land { position: relative; min-height: 100dvh; overflow-x: hidden; background: var(--bg); }

      .pd-scene { position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.95; }
      .pd-scene > svg { width: 100%; height: 100%; }

      .pd-nav, .pd-hero, .pd-section, .pd-final, .pd-foot, .pd-give-bar { position: relative; z-index: 1; }

      /* Bandeau + encart engagement caritatif */
      .pd-give-bar { display: flex; justify-content: center; padding: 10px 16px 0; }
      .pd-give-pill {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 8px 18px; border-radius: 999px;
        background: linear-gradient(135deg, #e8452f, #c2261a);
        color: #fff; font-weight: 800; font-size: 13.5px; text-align: center;
        box-shadow: 0 6px 18px rgba(194, 38, 26, 0.28);
      }
      .pd-give {
        display: flex; gap: 22px; align-items: center; flex-wrap: wrap;
        background: linear-gradient(135deg, #fff6f4, #ffffff);
        border: 2px solid #e8452f; border-radius: 22px;
        padding: clamp(20px, 3vw, 32px);
        box-shadow: 0 12px 34px rgba(194, 38, 26, 0.14);
      }
      .pd-give-icon { font-size: 54px; line-height: 1; animation: pdHeart 1.8s ease-in-out infinite; }
      @keyframes pdHeart {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.16); }
      }

      .pd-nav {
        display: flex; justify-content: space-between; align-items: center; gap: 10px;
        padding: 14px clamp(14px, 4vw, 44px); flex-wrap: wrap;
      }

      /* HERO */
      .pd-hero {
        display: grid; grid-template-columns: 1fr; gap: 30px; align-items: center;
        padding: clamp(20px, 4vw, 54px) clamp(16px, 5vw, 48px);
        max-width: 1160px; margin: 0 auto;
      }
      @media (min-width: 940px) { .pd-hero { grid-template-columns: 1.12fr 0.88fr; } }

      .pd-hero-left {
        background: rgba(247, 250, 244, 0.72);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 24px;
        padding: clamp(20px, 3vw, 34px);
        box-shadow: 0 10px 40px rgba(28, 43, 33, 0.12);
      }
      .pd-badge {
        display: inline-block; padding: 7px 14px; border-radius: 999px;
        background: #ffffff; border: 1px solid var(--border);
        font-size: 13px; font-weight: 700; margin-bottom: 16px;
        box-shadow: var(--shadow);
      }
      .pd-title {
        font-size: clamp(32px, 5.6vw, 56px); line-height: 1.05; font-weight: 900;
        letter-spacing: -1.4px; margin: 0 0 14px; color: #17251c;
      }
      .pd-grad {
        background: linear-gradient(100deg, #2a5c3a, #4f7d43 55%, #7a5636);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .pd-sub {
        color: #33443a; font-size: clamp(15px, 1.9vw, 17.5px); line-height: 1.65;
        max-width: 520px; margin: 0 0 20px;
      }

      .pd-stone-row { display: flex; gap: 7px; margin-bottom: 22px; flex-wrap: wrap; }
      .pd-stone-demo {
        width: 30px; height: 24px; border-radius: 50%;
        box-shadow: inset -3px -3px 6px rgba(0, 0, 0, 0.25),
                    inset 3px 3px 6px rgba(255, 255, 255, 0.4),
                    0 3px 6px rgba(28, 43, 33, 0.18);
        animation: pdStoneBob 3.4s ease-in-out infinite;
      }
      @keyframes pdStoneBob {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-5px) rotate(-4deg); }
      }

      .pd-hero-cta { display: flex; flex-wrap: wrap; gap: 12px; }
      .pd-btn-lg { padding: 14px 22px; font-size: 16px; }

      .pd-stats { display: flex; flex-wrap: wrap; gap: 26px; margin-top: 30px; }
      .pd-stats > div { display: flex; flex-direction: column; }
      .pd-stats strong { font-size: 24px; font-weight: 900; color: #17251c; }
      .pd-stats span { color: var(--muted); font-size: 13px; }

      .pd-signin { padding: 26px; animation: pdRise 0.6s ease both; }
      @keyframes pdRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
      .pd-or {
        display: flex; align-items: center; gap: 10px; margin: 18px 0;
        color: var(--muted); font-size: 13px;
      }
      .pd-or span { flex: 1; height: 1px; background: var(--border); }

      /* Sections */
      .pd-section { max-width: 1100px; margin: 0 auto; padding: clamp(24px, 4vw, 52px) clamp(16px, 5vw, 48px); }
      .pd-h2 {
        font-size: clamp(23px, 3.6vw, 34px); font-weight: 900; text-align: center;
        margin: 0 0 6px; letter-spacing: -0.5px; color: #17251c;
      }
      .pd-h2-sub { text-align: center; color: var(--muted); margin: 0 0 24px; }
      .pd-h2 + .pd-cards, .pd-h2 + .pd-steps { margin-top: 24px; }

      /* Encart œuvre collective */
      .pd-highlight {
        display: flex; gap: 22px; align-items: center; flex-wrap: wrap;
        background: linear-gradient(135deg, #f4f9f1, #ffffff);
        border: 2px solid var(--accent);
        border-radius: 22px;
        padding: clamp(20px, 3vw, 32px);
        box-shadow: 0 12px 34px rgba(63, 125, 78, 0.14);
      }
      .pd-highlight h2 { color: #17251c; }
      .pd-highlight p, .pd-highlight-list { color: #2e3f34; }
      .pd-highlight-icon {
        font-size: 54px; line-height: 1;
        animation: pdBob 3s ease-in-out infinite;
      }
      @keyframes pdBob {
        0%, 100% { transform: translateY(0) rotate(-3deg); }
        50% { transform: translateY(-8px) rotate(3deg); }
      }
      .pd-highlight-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; font-size: 15px; }

      /* Cartes */
      .pd-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
      .pd-cards-4 { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
      .pd-cards-5 { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
      .pd-card {
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid var(--border); border-radius: 18px;
        padding: 20px; transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        display: flex; flex-direction: column; gap: 6px; position: relative;
        backdrop-filter: blur(4px);
      }
      .pd-card:hover {
        transform: translateY(-4px); border-color: var(--accent);
        box-shadow: 0 14px 30px rgba(28, 43, 33, 0.16);
      }
      .pd-feature-emoji { font-size: 30px; margin-bottom: 6px; }
      .pd-item-emoji { font-size: 34px; }
      .pd-price { font-size: 20px; font-weight: 800; margin-top: 4px; }

      .pd-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
      .pd-step-n {
        width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
        font-weight: 900; font-size: 20px; margin-bottom: 8px;
        background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #fff;
      }

      .pd-pack { align-items: flex-start; }
      .pd-pack-hot { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
      .pd-hot {
        position: absolute; top: -10px; right: 12px; font-size: 10px; font-weight: 800;
        padding: 3px 9px; border-radius: 999px; color: #fff;
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
      }

      .pd-final {
        max-width: 720px; margin: 0 auto; text-align: center;
        padding: clamp(28px, 5vw, 60px) 20px;
        display: flex; flex-direction: column; align-items: center;
      }
      .pd-foot {
        text-align: center; color: var(--muted);
        padding: 26px 20px calc(36px + var(--safe-bottom));
        border-top: 1px solid var(--border); margin-top: 16px;
        background: rgba(255, 255, 255, 0.6);
      }
    `}</style>
  );
}
