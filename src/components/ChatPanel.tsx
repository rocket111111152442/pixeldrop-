"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ITEM_LABELS } from "@/lib/products";

type Msg = {
  id: string;
  text: string;
  at: string;
  pseudo: string;
  level: number;
  admin: boolean;
  badge: string | null;
  color: string | null;
};

export default function ChatPanel({
  me,
  guest,
  isAdmin,
  onClose,
  onToast,
  onAchievements,
}: {
  me: string | null;
  guest: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onToast: (msg: string, type?: "error" | "success") => void;
  onAchievements?: (ids: string[]) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const stickBottomRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/chat", { cache: "no-store" });
      const d = await r.json();
      setMessages(d.messages || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stickBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const d = await r.json();
      if (!r.ok) {
        onToast(d.error || "Message refusé.");
        return;
      }
      setText("");
      if (d.newAchievements?.length) onAchievements?.(d.newAchievements);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch("/api/chat", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  return (
    <div className="pd-chat pd-panel">
      <div className="pd-chat-head">
        <strong>💬 Chat</strong>
        <button className="pd-btn pd-mini" onClick={onClose}>✕</button>
      </div>
      <div
        className="pd-chat-list"
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 16 }}>
            Aucun message — lance la conversation !
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="pd-chat-msg">
            <span className="pd-chat-meta">
              <span
                className={m.color === "rainbow" ? "pd-rainbow-text" : undefined}
                style={{
                  fontWeight: 700,
                  color: m.color && m.color !== "rainbow" ? m.color : undefined,
                }}
              >
                {m.badge && ITEM_LABELS[m.badge] ? ITEM_LABELS[m.badge].emoji + " " : ""}
                {m.pseudo}
              </span>
              {m.admin && <span title="Admin"> 👑</span>}
              <span className="pd-chat-lvl"> niv {m.level}</span>
            </span>
            <span className="pd-chat-text">{m.text}</span>
            {(isAdmin || (me && m.pseudo === me)) && (
              <button className="pd-chat-del" title="Supprimer" onClick={() => remove(m.id)}>
                🗑
              </button>
            )}
          </div>
        ))}
      </div>
      {guest ? (
        <div style={{ padding: 10, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
          Connecte-toi pour participer au chat.
        </div>
      ) : (
        <form onSubmit={send} className="pd-chat-form">
          <input
            className="pd-input"
            placeholder="Ton message… (200 max)"
            maxLength={200}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="pd-btn pd-btn-primary" disabled={busy || !text.trim()}>
            ➤
          </button>
        </form>
      )}
    </div>
  );
}
