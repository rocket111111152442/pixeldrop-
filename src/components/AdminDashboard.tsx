"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ITEM_LABELS } from "@/lib/products";

type AdminUser = {
  id: string;
  pseudo: string;
  email: string | null;
  image: string | null;
  credits: number;
  banned: boolean;
  isAdmin: boolean;
  totalPlaced: number;
  totalSpentCts: number;
  createdAt: string;
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

const CHF = (cts: number) => (cts / 100).toFixed(2) + " CHF";

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [u, s] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setUsers(u.users || []);
    setStats(s);
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
    const d = await r.json();
    if (!r.ok) setMsg(d.error || "Erreur");
    else setMsg("✅ OK");
    load();
  };

  const ban = (u: AdminUser) => {
    if (!u.banned && !confirm(`Bannir ${u.pseudo} ? Tous ses pixels seront supprimés.`)) return;
    post("/api/admin/ban", { userId: u.id, banned: !u.banned });
  };

  const grantCredits = (u: AdminUser) => {
    const v = prompt(`Combien de pixels offrir à ${u.pseudo} ? (nombre négatif pour retirer)`, "100");
    if (v == null) return;
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return;
    post("/api/admin/grant", { userId: u.id, credits: n });
  };

  const grantItem = (u: AdminUser) => {
    const sku = prompt(`Item à offrir à ${u.pseudo} ? (bomb, mega_bomb, shield, golden)`, "bomb");
    if (!sku || !ITEM_LABELS[sku]) return;
    const v = prompt("Quantité ?", "5");
    const n = parseInt(v || "0", 10);
    if (!Number.isFinite(n)) return;
    post("/api/admin/grant", { userId: u.id, itemSku: sku, itemQty: n });
  };

  const deletePixel = () => {
    const c = prompt("Supprimer le pixel aux coordonnées x,y :", "0,0");
    if (!c) return;
    const [x, y] = c.split(",").map((s) => parseInt(s.trim(), 10));
    post("/api/admin/pixel", { x, y }, "DELETE");
  };

  const clearArea = () => {
    const c = prompt("Effacer une zone x,y,largeur,hauteur :", "0,0,10,10");
    if (!c) return;
    const [x, y, w, h] = c.split(",").map((s) => parseInt(s.trim(), 10));
    post("/api/admin/pixel", { x, y, w, h }, "DELETE");
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>👑 Administration</h1>
        <Link href="/" className="pd-btn" style={{ textDecoration: "none" }}>← Canvas</Link>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, margin: "16px 0" }}>
          <StatCard label="Comptes" value={String(stats.userCount)} />
          <StatCard label="Pixels posés" value={stats.pixelCount.toLocaleString("fr-CH")} />
          <StatCard label="Remplissage" value={stats.fillPct.toFixed(3) + " %"} />
          <StatCard label="Revenus" value={CHF(stats.revenueCts)} />
          <StatCard label="Commandes payées" value={String(stats.paidOrders)} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button className="pd-btn" onClick={deletePixel}>🗑️ Supprimer un pixel</button>
        <button className="pd-btn" onClick={clearArea}>🧹 Effacer une zone</button>
        <button className="pd-btn" onClick={load}>🔄 Rafraîchir</button>
        {msg && <span style={{ alignSelf: "center", color: "var(--muted)" }}>{msg}</span>}
      </div>

      <div className="pd-panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)" }}>
              <th style={th}>Pseudo</th>
              <th style={th}>Email</th>
              <th style={th}>Pixels</th>
              <th style={th}>Crédits</th>
              <th style={th}>Posés</th>
              <th style={th}>Dépensé</th>
              <th style={th}>Statut</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={td}>{u.pseudo} {u.isAdmin && "👑"}</td>
                <td style={td}>{u.email || "—"}</td>
                <td style={td}>{u._count.pixels}</td>
                <td style={td}>{u.credits}</td>
                <td style={td}>{u.totalPlaced}</td>
                <td style={td}>{CHF(u.totalSpentCts)}</td>
                <td style={td}>{u.banned ? <span style={{ color: "#ff8ba0" }}>banni</span> : "actif"}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="pd-btn" style={mini} onClick={() => grantCredits(u)}>+ pixels</button>
                    <button className="pd-btn" style={mini} onClick={() => grantItem(u)}>+ item</button>
                    {!u.isAdmin && (
                      <button className="pd-btn" style={{ ...mini, borderColor: u.banned ? "#37d67a" : "#ff5c7a" }} onClick={() => ban(u)}>
                        {u.banned ? "débannir" : "bannir"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
const mini: React.CSSProperties = { padding: "4px 8px", fontSize: 12 };

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="pd-panel" style={{ padding: 14 }}>
      <div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
