"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/Logo";
import { ITEM_LABELS } from "@/lib/products";
import { ACHIEVEMENTS } from "@/lib/achievements";

type Me = {
  authenticated: boolean;
  pseudo?: string;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  credits?: number;
  totalPlaced?: number;
  ownedPixels?: number;
  xp?: number;
  level?: number;
  xpNext?: number;
  xpBase?: number;
  achievements?: string[];
  equippedBadge?: string | null;
  equippedTitle?: string | null;
  nameColor?: string | null;
  referralCode?: string | null;
  referredBy?: boolean;
  dailyStreak?: number;
  hasPassword?: boolean;
  memberSince?: string;
  unlocks?: string[];
};

type Purchase = {
  id: string;
  label: string;
  amountCts: number;
  status: string;
  result: string | null;
  createdAt: string;
};

const EUR = (cts: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cts / 100);

export default function ProfilPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [msg, setMsg] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [refInput, setRefInput] = useState("");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/me", { cache: "no-store" });
    const d = await r.json();
    if (!d.authenticated) {
      router.push("/login");
      return;
    }
    setMe(d);
    setPseudo(d.pseudo || "");
    fetch("/api/me/purchases", { cache: "no-store" })
      .then((x) => x.json())
      .then((x) => setPurchases(x.purchases || []))
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (url: string, body: unknown): Promise<boolean> => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "✅ Enregistré !" : d.error || "Erreur.");
    if (r.ok) load();
    return r.ok;
  };

  if (!me) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--muted)" }}>
        Chargement…
      </div>
    );
  }

  const badges = (me.unlocks || []).filter((u) => u.startsWith("badge_"));
  const titles = (me.unlocks || []).filter((u) => u.startsWith("title_"));
  const colors = (me.unlocks || []).filter((u) => u.startsWith("name_"));
  const achieved = new Set(me.achievements || []);
  const xpSpan = (me.xpNext ?? 100) - (me.xpBase ?? 0) || 1;
  const xpPct = Math.min(100, Math.max(0, (((me.xp ?? 0) - (me.xpBase ?? 0)) / xpSpan) * 100));

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Logo size={28} />
        </Link>
        <Link href="/" className="pd-btn" style={{ textDecoration: "none" }}>← Carte</Link>
      </div>

      {/* Carte identité */}
      <div className="pd-panel" style={{ padding: 20, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        {me.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.image} alt="" width={64} height={64} style={{ borderRadius: 16 }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--panel-2)", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 800 }}>
            {me.pseudo?.[0]?.toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {me.equippedBadge && ITEM_LABELS[me.equippedBadge] ? ITEM_LABELS[me.equippedBadge].emoji + " " : ""}
            <span
              className={me.nameColor === "rainbow" ? "pd-rainbow-text" : undefined}
              style={{ color: me.nameColor && me.nameColor !== "rainbow" ? me.nameColor : undefined }}
            >
              {me.pseudo}
            </span>
            {me.isAdmin && " 👑"}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {me.equippedTitle && ITEM_LABELS[me.equippedTitle] ? `« ${ITEM_LABELS[me.equippedTitle].label} » · ` : ""}
            Membre depuis {me.memberSince ? new Date(me.memberSince).toLocaleDateString("fr-FR") : "—"}
          </div>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Niveau {me.level}</span>
            <div style={{ flex: 1, maxWidth: 220, height: 8, borderRadius: 999, background: "var(--panel-2)", overflow: "hidden" }}>
              <div style={{ width: `${xpPct}%`, height: "100%", background: "linear-gradient(90deg,var(--accent),var(--accent-2))" }} />
            </div>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>{me.xp} / {me.xpNext} XP</span>
          </div>
        </div>
        <div style={{ display: "grid", gap: 4, textAlign: "right" }}>
          <div><strong style={{ color: "var(--accent)" }}>{me.isAdmin ? "∞" : me.credits}</strong> <span style={{ color: "var(--muted)", fontSize: 12 }}>crédits</span></div>
          <div><strong>{me.ownedPixels}</strong> <span style={{ color: "var(--muted)", fontSize: 12 }}>possédés</span></div>
          <div><strong>{me.totalPlaced}</strong> <span style={{ color: "var(--muted)", fontSize: 12 }}>posés</span></div>
          <div><strong>🔥 {me.dailyStreak}</strong> <span style={{ color: "var(--muted)", fontSize: 12 }}>j. de série</span></div>
        </div>
      </div>

      {msg && <div className="pd-panel" style={{ padding: 10, margin: "12px 0", fontSize: 14 }}>{msg}</div>}

      {/* Succès */}
      <h2 style={{ fontSize: 18, margin: "22px 0 10px" }}>
        🏆 Succès ({achieved.size}/{Object.keys(ACHIEVEMENTS).length})
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
        {Object.entries(ACHIEVEMENTS).map(([id, a]) => {
          const has = achieved.has(id);
          return (
            <div key={id} className="pd-panel" style={{ padding: 10, opacity: has ? 1 : 0.4 }}>
              <div style={{ fontSize: 20 }}>{has ? a.emoji : "🔒"}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{a.label}</div>
              <div style={{ color: "var(--muted)", fontSize: 11 }}>{a.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Personnalisation */}
      <h2 style={{ fontSize: 18, margin: "22px 0 10px" }}>👑 Personnalisation</h2>
      <div className="pd-panel" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Badge</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="pd-btn pd-mini" style={!me.equippedBadge ? onSty : {}} onClick={() => post("/api/me/equip", { badge: "" })}>Aucun</button>
            {badges.map((b) => (
              <button key={b} className="pd-btn pd-mini" style={me.equippedBadge === b ? onSty : {}} onClick={() => post("/api/me/equip", { badge: b })}>
                {ITEM_LABELS[b]?.emoji} {ITEM_LABELS[b]?.label.replace("Badge ", "")}
              </button>
            ))}
            {badges.length === 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>Achète des badges dans la <Link href="/boutique" style={{ color: "var(--accent)" }}>boutique</Link>.</span>}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Titre</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="pd-btn pd-mini" style={!me.equippedTitle ? onSty : {}} onClick={() => post("/api/me/equip", { title: "" })}>Aucun</button>
            {titles.map((t) => (
              <button key={t} className="pd-btn pd-mini" style={me.equippedTitle === t ? onSty : {}} onClick={() => post("/api/me/equip", { title: t })}>
                {ITEM_LABELS[t]?.emoji} {ITEM_LABELS[t]?.label}
              </button>
            ))}
            {titles.length === 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>Aucun titre possédé.</span>}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Couleur du pseudo</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="pd-btn pd-mini" style={!me.nameColor ? onSty : {}} onClick={() => post("/api/me/equip", { nameColor: "" })}>Standard</button>
            {colors.map((c) => (
              <button key={c} className="pd-btn pd-mini" onClick={() => post("/api/me/equip", { nameColor: c })}>
                {ITEM_LABELS[c]?.emoji} {ITEM_LABELS[c]?.label.replace("Pseudo ", "")}
              </button>
            ))}
            {colors.length === 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>Aucune couleur possédée.</span>}
          </div>
        </div>
      </div>

      {/* Parrainage */}
      <h2 style={{ fontSize: 18, margin: "22px 0 10px" }}>🤝 Parrainage</h2>
      <div className="pd-panel" style={{ padding: 16, display: "grid", gap: 10 }}>
        <div style={{ fontSize: 14 }}>
          Ton code : <strong style={{ color: "var(--accent)", fontSize: 16 }}>{me.referralCode}</strong>{" "}
          <button
            className="pd-btn pd-mini"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/register?ref=${me.referralCode}`).catch(() => {});
              setMsg("🔗 Lien de parrainage copié !");
            }}
          >
            Copier le lien
          </button>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Chaque ami inscrit avec ton code = <strong>+5 cailloux pour vous deux</strong>.
        </div>
        {!me.referredBy && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              post("/api/referral", { code: refInput });
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <input className="pd-input" style={{ maxWidth: 200 }} placeholder="Code d'un ami" value={refInput} onChange={(e) => setRefInput(e.target.value)} />
            <button className="pd-btn pd-btn-primary" disabled={!refInput.trim()}>Utiliser</button>
          </form>
        )}
      </div>

      {/* Compte */}
      <h2 style={{ fontSize: 18, margin: "22px 0 10px" }}>⚙️ Mon compte</h2>
      <div className="pd-panel" style={{ padding: 16, display: "grid", gap: 14 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            post("/api/me/pseudo", { pseudo });
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, width: 110 }}>Pseudo</span>
          <input className="pd-input" style={{ maxWidth: 220 }} value={pseudo} onChange={(e) => setPseudo(e.target.value)} minLength={3} maxLength={20} />
          <button className="pd-btn">Changer</button>
        </form>

        {me.hasPassword && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await post("/api/me/password", { oldPassword: oldPwd, newPassword: newPwd });
              if (ok) {
                setOldPwd("");
                setNewPwd("");
              }
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, width: 110 }}>Mot de passe</span>
            <input className="pd-input" style={{ maxWidth: 170 }} type="password" placeholder="Actuel" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} required />
            <input className="pd-input" style={{ maxWidth: 170 }} type="password" placeholder="Nouveau (8+)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} minLength={8} required />
            <button className="pd-btn">Changer</button>
          </form>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="pd-btn" onClick={() => signOut({ callbackUrl: "/" })}>🚪 Se déconnecter</button>
          {!me.isAdmin && (
            <button
              className="pd-btn"
              style={{ borderColor: "#ff5c7a", color: "#ffb3c1" }}
              onClick={async () => {
                const c = prompt('Supprimer définitivement ton compte ? Écris "SUPPRIMER" pour confirmer.');
                if (c !== "SUPPRIMER") return;
                const r = await fetch("/api/me/delete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ confirm: "SUPPRIMER" }),
                });
                if (r.ok) signOut({ callbackUrl: "/" });
                else setMsg("Suppression impossible.");
              }}
            >
              🗑️ Supprimer mon compte
            </button>
          )}
        </div>
      </div>

      {/* Achats */}
      <h2 style={{ fontSize: 18, margin: "22px 0 10px" }}>🧾 Mes achats</h2>
      <div className="pd-panel" style={{ overflow: "hidden" }}>
        {purchases.length === 0 ? (
          <div style={{ padding: 16, color: "var(--muted)", fontSize: 14 }}>
            Aucun achat pour l'instant — la <Link href="/boutique" style={{ color: "var(--accent)" }}>boutique</Link> t'attend !
          </div>
        ) : (
          purchases.map((p, i) => (
            <div key={p.id} style={{ display: "flex", gap: 10, padding: "10px 16px", borderTop: i > 0 ? "1px solid var(--border)" : undefined, fontSize: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ flex: 1, minWidth: 140 }}>
                <strong>{p.label}</strong>
                {p.result && <span style={{ color: "var(--muted)" }}> — {p.result}</span>}
              </span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString("fr-FR")}</span>
              <span style={{ fontWeight: 700 }}>{EUR(p.amountCts)}</span>
              <span style={{ fontSize: 12, color: p.status === "paid" ? "#37d67a" : "var(--muted)" }}>
                {p.status === "paid" ? "payé" : p.status === "pending" ? "en attente" : p.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const onSty: React.CSSProperties = {
  borderColor: "var(--accent)",
  boxShadow: "0 0 0 1px var(--accent) inset",
};
