"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ITEM_LABELS } from "@/lib/products";
import AdminQuests from "@/components/AdminQuests";

type AdminUser = {
  id: string;
  pseudo: string;
  email: string | null;
  image: string | null;
  credits: number;
  banned: boolean;
  muted: boolean;
  isAdmin: boolean;
  totalPlaced: number;
  totalSpentCts: number;
  createdAt: string;
  bannedAt: string | null;
  banExpiresAt: string | null;
  banReason: string | null;
  banCategory: string | null;
  banSource: string | null;
  banSeverity: string | null;
  banAppealDeadline: string | null;
  banAppealText: string | null;
  banAppealedAt: string | null;
  banAppealStatus: string;
  banDeleteAfter: string | null;
  _count: { pixels: number };
};

type Stats = {
  userCount: number;
  pixelCount: number;
  totalPixels: number;
  fillPct: number;
  revenueCts: number;
  paidOrders: number;
};

type Report = {
  id: string;
  x: number;
  y: number;
  reason: string;
  by: string;
  at: string;
  pixel: { color: string; link: string | null; text: string | null; owner: string } | null;
};

type AdminPurchase = {
  id: string;
  pseudo: string;
  email: string | null;
  label: string;
  amountCts: number;
  status: string;
  result: string | null;
  at: string;
};

type ModerationUser = {
  id: string;
  pseudo: string;
  email: string | null;
  banned?: boolean;
  banReason?: string | null;
  banExpiresAt?: string | null;
  banAppealDeadline?: string | null;
  banAppealStatus?: string | null;
};

type ModerationCase = {
  id: string;
  source: string;
  targetType: string;
  targetId: string | null;
  user: ModerationUser | null;
  x: number | null;
  y: number | null;
  link: string | null;
  text: string | null;
  category: string;
  severity: string;
  action: string;
  reason: string;
  details: string | null;
  createdAt: string;
};

type BanAppeal = {
  id: string;
  pseudo: string;
  email: string | null;
  banReason: string | null;
  banCategory: string | null;
  banSeverity: string | null;
  banSource: string | null;
  bannedAt: string | null;
  banExpiresAt: string | null;
  banAppealDeadline: string | null;
  banAppealText: string | null;
  banAppealedAt: string | null;
};

const EUR = (cts: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cts / 100);

type Tab = "overview" | "users" | "moderation" | "reports" | "purchases";

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([]);
  const [appeals, setAppeals] = useState<BanAppeal[]>([]);
  const [purchases, setPurchases] = useState<AdminPurchase[]>([]);
  const [search, setSearch] = useState("");
  const [announce, setAnnounce] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [u, s, rep, mod, pur, ann] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/reports", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ reports: [] })),
      fetch("/api/admin/moderation", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ cases: [], appeals: [] })),
      fetch("/api/admin/purchases", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ purchases: [] })),
      fetch("/api/announce", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ text: "" })),
    ]);
    setUsers(u.users || []);
    setStats(s);
    setReports(rep.reports || []);
    setModerationCases(mod.cases || []);
    setAppeals(mod.appeals || []);
    setPurchases(pur.purchases || []);
    setAnnounce(ann.text || "");
    const m: Record<string, boolean> = {};
    for (const usr of u.users || []) m[usr.id] = !!(usr as { muted?: boolean }).muted;
    setMuted(m);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (url: string, body: unknown, method = "POST") => {
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "✅ OK" : d.error || "Erreur");
    load();
  };

  const ban = (u: AdminUser) => {
    if (u.banned) {
      post("/api/admin/ban", { userId: u.id, banned: false });
      return;
    }
    const reason = prompt(`Raison du bannissement pour ${u.pseudo} ?`, "Sanction de moderation.");
    if (!reason) return;
    const duration = prompt("Durée du ban : nombre de jours, ou permanent", "30");
    if (!duration) return;
    const normalized = duration.trim().toLowerCase();
    const permanent = normalized.startsWith("per") || normalized.startsWith("def");
    const durationDays = parseInt(normalized, 10);
    if (!permanent && (!Number.isFinite(durationDays) || durationDays <= 0)) return;
    post("/api/admin/ban", { userId: u.id, banned: true, reason, permanent, durationDays });
  };

  const grantCredits = (u: AdminUser) => {
    const v = prompt(`Pixels à offrir à ${u.pseudo} ? (négatif pour retirer)`, "100");
    if (v == null) return;
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return;
    post("/api/admin/grant", { userId: u.id, credits: n });
  };

  const grantItem = (u: AdminUser) => {
    const sku = prompt(
      `Item pour ${u.pseudo} ?\n(${Object.keys(ITEM_LABELS).slice(0, 11).join(", ")}…)`,
      "bomb",
    );
    if (!sku || !ITEM_LABELS[sku]) return;
    const v = prompt("Quantité ?", "5");
    const n = parseInt(v || "0", 10);
    if (!Number.isFinite(n)) return;
    post("/api/admin/grant", { userId: u.id, itemSku: sku, itemQty: n });
  };

  const filtered = users.filter(
    (u) =>
      !search ||
      u.pseudo.toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Logo size={28} />
        </Link>
        <Link href="/" className="pd-btn" style={{ textDecoration: "none" }}>← Carte</Link>
      </div>

      <h1 style={{ margin: "14px 0 10px" }}>👑 Administration</h1>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {([
          ["overview", "📊 Vue d'ensemble"],
          ["users", `👥 Comptes (${users.length})`],
          ["moderation", `🛡️ Modération (${moderationCases.length + appeals.length})`],
          ["reports", `🚩 Signalements (${reports.length})`],
          ["purchases", "🧾 Achats"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            className="pd-btn"
            style={tab === id ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent) inset" } : {}}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        {msg && <span style={{ alignSelf: "center", color: "var(--muted)", fontSize: 13 }}>{msg}</span>}
      </div>

      {/* ── Vue d'ensemble ── */}
      {tab === "overview" && stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
            <StatCard label="Comptes" value={String(stats.userCount)} />
            <StatCard label="Pixels posés" value={stats.pixelCount.toLocaleString("fr-FR")} />
            <StatCard label="Remplissage" value={stats.fillPct.toFixed(3) + " %"} />
            <StatCard label="Revenus" value={EUR(stats.revenueCts)} />
            <StatCard label="Commandes payées" value={String(stats.paidOrders)} />
          </div>

          <div className="pd-panel" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>📢 Annonce globale (bandeau en jeu)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                className="pd-input"
                style={{ flex: 1, minWidth: 220 }}
                placeholder="Texte de l'annonce (vide = aucune)"
                value={announce}
                maxLength={200}
                onChange={(e) => setAnnounce(e.target.value)}
              />
              <button className="pd-btn pd-btn-primary" onClick={() => post("/api/admin/announce", { text: announce })}>
                Publier
              </button>
              <button className="pd-btn" onClick={() => { setAnnounce(""); post("/api/admin/announce", { text: "" }); }}>
                Effacer
              </button>
            </div>
          </div>

          <AdminQuests onMsg={setMsg} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="pd-btn"
              onClick={() => {
                const c = prompt("Supprimer le pixel aux coordonnées x,y :", "0,0");
                if (!c) return;
                const [x, y] = c.split(",").map((s) => parseInt(s.trim(), 10));
                post("/api/admin/pixel", { x, y }, "DELETE");
              }}
            >
              🗑️ Supprimer un pixel
            </button>
            <button
              className="pd-btn"
              onClick={() => {
                const c = prompt("Effacer une zone x,y,largeur,hauteur :", "0,0,10,10");
                if (!c) return;
                const [x, y, w, h] = c.split(",").map((s) => parseInt(s.trim(), 10));
                post("/api/admin/pixel", { x, y, w, h }, "DELETE");
              }}
            >
              🧹 Effacer une zone
            </button>
            <a className="pd-btn" href="/api/admin/export" style={{ textDecoration: "none" }}>
              📥 Export CSV des comptes
            </a>
            <button className="pd-btn" onClick={load}>🔄 Rafraîchir</button>
          </div>
        </>
      )}

      {/* ── Comptes ── */}
      {tab === "users" && (
        <>
          <input
            className="pd-input"
            style={{ marginBottom: 10, maxWidth: 320 }}
            placeholder="🔎 Rechercher un pseudo ou un email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="pd-panel" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                  <th style={th}>Pseudo</th>
                  <th style={th}>Email</th>
                  <th style={th}>Pixels</th>
                  <th style={th}>Crédits</th>
                  <th style={th}>Dépensé</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={td}>{u.pseudo} {u.isAdmin && "👑"}</td>
                    <td style={td}>{u.email || "—"}</td>
                    <td style={td}>{u._count.pixels}</td>
                    <td style={td}>{u.credits}</td>
                    <td style={td}>{EUR(u.totalSpentCts)}</td>
                    <td style={td}>
                      {u.banned ? (
                        <span style={{ color: "#ff8ba0" }}>
                          banni
                          {u.banExpiresAt ? ` jusqu'au ${new Date(u.banExpiresAt).toLocaleDateString("fr-FR")}` : " definitif"}
                        </span>
                      ) : "actif"}
                      {muted[u.id] && <span style={{ color: "var(--muted)" }}> · muet</span>}
                      {u.banAppealStatus === "pending" && <span style={{ color: "var(--accent)" }}> · contestation</span>}
                      {u.banReason && (
                        <div style={{ color: "var(--muted)", fontSize: 12, maxWidth: 220 }}>
                          {u.banReason}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <button className="pd-btn pd-mini" onClick={() => grantCredits(u)}>+ pixels</button>
                        <button className="pd-btn pd-mini" onClick={() => grantItem(u)}>+ item</button>
                        {!u.isAdmin && (
                          <>
                            <button
                              className="pd-btn pd-mini"
                              onClick={() => {
                                setMuted((m) => ({ ...m, [u.id]: !m[u.id] }));
                                post("/api/admin/mute", { userId: u.id, muted: !muted[u.id] });
                              }}
                            >
                              {muted[u.id] ? "🔊 démuter" : "🔇 muet"}
                            </button>
                            <button
                              className="pd-btn pd-mini"
                              style={{ borderColor: u.banned ? "#37d67a" : "#ff5c7a" }}
                              onClick={() => ban(u)}
                            >
                              {u.banned ? "débannir" : "bannir"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Modération automatique + contestations ── */}
      {tab === "moderation" && (
        <div style={{ display: "grid", gap: 12 }}>
          {appeals.length > 0 && (
            <div className="pd-panel" style={{ padding: 14, display: "grid", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Contestations à traiter</h2>
              {appeals.map((a) => (
                <div key={a.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "grid", gap: 6, fontSize: 14 }}>
                  <div>
                    <strong>{a.pseudo}</strong>{" "}
                    <span style={{ color: "var(--muted)" }}>{a.email || "—"}</span>
                  </div>
                  <div><strong>Sanction :</strong> {a.banReason || "—"}</div>
                  <div style={{ color: "var(--muted)" }}>
                    {a.banSeverity === "permanent_ban" ? "Ban définitif" : "Ban temporaire"}
                    {a.banExpiresAt ? ` · fin ${new Date(a.banExpiresAt).toLocaleString("fr-FR")}` : ""}
                    {a.banAppealedAt ? ` · contesté le ${new Date(a.banAppealedAt).toLocaleString("fr-FR")}` : ""}
                  </div>
                  <div className="pd-panel" style={{ padding: 10, background: "var(--panel-2)" }}>
                    {a.banAppealText}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      className="pd-btn pd-mini"
                      style={{ borderColor: "#37d67a" }}
                      onClick={() => post("/api/admin/moderation", { action: "accept_appeal", userId: a.id })}
                    >
                      Débannir
                    </button>
                    <button
                      className="pd-btn pd-mini"
                      onClick={() => {
                        const note = prompt("Note admin pour confirmer le ban définitif ?", a.banReason || "");
                        if (note == null) return;
                        post("/api/admin/moderation", { action: "confirm_permanent", userId: a.id, note });
                      }}
                    >
                      Ban définitif
                    </button>
                    <button
                      className="pd-btn pd-mini"
                      style={{ borderColor: "#ff5c7a" }}
                      onClick={() => {
                        if (!confirm(`Rejeter la contestation et supprimer le compte ${a.pseudo} ?`)) return;
                        const note = prompt("Note admin :", "Contestation rejetée.");
                        post("/api/admin/moderation", { action: "reject_appeal_delete", userId: a.id, note });
                      }}
                    >
                      Rejeter + supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {moderationCases.length === 0 && appeals.length === 0 && (
            <div className="pd-panel" style={{ padding: 20, color: "var(--muted)", textAlign: "center" }}>
              Aucun dossier de modération en attente.
            </div>
          )}

          {moderationCases.map((c) => (
            <div key={c.id} className="pd-panel" style={{ padding: 14, display: "grid", gap: 7, fontSize: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{c.source === "bot" ? "Bot" : c.source} · {c.category}</strong>
                <span style={{ color: c.severity === "permanent_ban" ? "#ff8ba0" : c.severity === "temporary_ban" ? "#ffd166" : "var(--muted)" }}>
                  {c.severity}
                </span>
                <span style={{ color: "var(--muted)" }}>
                  {new Date(c.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
              <div>
                <strong>Compte :</strong>{" "}
                {c.user ? `${c.user.pseudo} (${c.user.email || "sans email"})` : "compte supprimé ou inconnu"}
              </div>
              <div><strong>Raison :</strong> {c.reason}</div>
              {c.details && <div style={{ color: "var(--muted)", whiteSpace: "pre-wrap" }}>{c.details}</div>}
              {c.text && (
                <div className="pd-panel" style={{ padding: 10, background: "var(--panel-2)", whiteSpace: "pre-wrap" }}>
                  {c.text}
                </div>
              )}
              {c.link && <div style={{ color: "var(--muted)", wordBreak: "break-all" }}>Lien : {c.link}</div>}
              {c.x !== null && c.y !== null && (
                <div style={{ color: "var(--muted)" }}>Pixel : ({c.x}, {c.y})</div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {c.targetType === "pixel" && c.x !== null && c.y !== null && (
                  <>
                    <button
                      className="pd-btn pd-mini"
                      style={{ borderColor: "#ff5c7a" }}
                      onClick={() => post("/api/admin/moderation", { id: c.id, action: "delete_pixel" })}
                    >
                      Supprimer le pixel
                    </button>
                    <Link className="pd-btn pd-mini" style={{ textDecoration: "none" }} href={`/?x=${c.x}&y=${c.y}&z=20`}>
                      Voir sur la carte
                    </Link>
                  </>
                )}
                {c.targetType === "chat" && c.targetId && (
                  <button
                    className="pd-btn pd-mini"
                    style={{ borderColor: "#ff5c7a" }}
                    onClick={() => post("/api/admin/moderation", { id: c.id, action: "delete_chat" })}
                  >
                    Supprimer le message
                  </button>
                )}
                {c.user && (
                  <>
                    <button
                      className="pd-btn pd-mini"
                      style={{ borderColor: "#37d67a" }}
                      onClick={() => post("/api/admin/moderation", { id: c.id, action: "unban_user" })}
                    >
                      Débannir
                    </button>
                    <button
                      className="pd-btn pd-mini"
                      onClick={() => {
                        const note = prompt("Note admin pour confirmer le ban définitif ?", c.reason);
                        if (note == null) return;
                        post("/api/admin/moderation", { id: c.id, action: "confirm_permanent", note });
                      }}
                    >
                      Ban définitif
                    </button>
                  </>
                )}
                <button className="pd-btn pd-mini" onClick={() => post("/api/admin/moderation", { id: c.id, action: "resolve" })}>
                  Résoudre
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Signalements ── */}
      {tab === "reports" && (
        <div style={{ display: "grid", gap: 10 }}>
          {reports.length === 0 && (
            <div className="pd-panel" style={{ padding: 20, color: "var(--muted)", textAlign: "center" }}>
              Aucun signalement en attente. 🎉
            </div>
          )}
          {reports.map((r) => (
            <div key={r.id} className="pd-panel" style={{ padding: 14, display: "grid", gap: 6, fontSize: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {r.pixel && (
                  <span style={{ width: 16, height: 16, borderRadius: 4, background: r.pixel.color, border: "1px solid var(--border)" }} />
                )}
                <strong>Pixel ({r.x}, {r.y})</strong>
                <span style={{ color: "var(--muted)" }}>
                  {r.pixel ? `par ${r.pixel.owner}` : "(déjà supprimé)"} · signalé par {r.by}
                </span>
              </div>
              <div>Raison : {r.reason}</div>
              {r.pixel?.text && <div style={{ color: "var(--muted)" }}>Message : « {r.pixel.text} »</div>}
              {r.pixel?.link && <div style={{ color: "var(--muted)", wordBreak: "break-all" }}>Lien : {r.pixel.link}</div>}
              <div style={{ display: "flex", gap: 6 }}>
                <button className="pd-btn pd-mini" style={{ borderColor: "#ff5c7a" }} onClick={() => post("/api/admin/reports", { id: r.id, action: "delete_pixel" })}>
                  🗑️ Supprimer le pixel
                </button>
                <button className="pd-btn pd-mini" onClick={() => post("/api/admin/reports", { id: r.id, action: "resolve" })}>
                  ✅ Ignorer
                </button>
                <Link className="pd-btn pd-mini" style={{ textDecoration: "none" }} href={`/?x=${r.x}&y=${r.y}&z=20`}>
                  👁 Voir sur la carte
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Achats ── */}
      {tab === "purchases" && (
        <div className="pd-panel" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={th}>Date</th>
                <th style={th}>Joueur</th>
                <th style={th}>Article</th>
                <th style={th}>Montant</th>
                <th style={th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={td}>{new Date(p.at).toLocaleString("fr-FR")}</td>
                  <td style={td}>{p.pseudo}</td>
                  <td style={td}>{p.label}{p.result ? ` — ${p.result}` : ""}</td>
                  <td style={td}>{EUR(p.amountCts)}</td>
                  <td style={td}>
                    <span style={{ color: p.status === "paid" ? "#37d67a" : "var(--muted)" }}>{p.status}</span>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr><td style={td} colSpan={5}><span style={{ color: "var(--muted)" }}>Aucun achat.</span></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="pd-panel" style={{ padding: 14 }}>
      <div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
