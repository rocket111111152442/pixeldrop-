// Assainisseurs d'entrées partagés par toutes les routes.

/** Garde uniquement les caractères imprimables, coupe à maxLen. */
export function cleanText(v: unknown, maxLen = 140): string | null {
  const raw = String(v ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 32 && code !== 127) out += ch;
    else if (ch === "\n" && maxLen > 200) out += "\n"; // autorisé pour les longs textes
    if (out.length >= maxLen * 2) break;
  }
  const s = out.trim().slice(0, maxLen);
  return s || null;
}

/** URL http(s) valide uniquement — bloque javascript:, data:, etc. */
export function cleanLink(v: unknown): string | null | "invalid" {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (s.length > 500) return "invalid";
  try {
    const u = new URL(s);
    if (u.username || u.password) return "invalid";
    const host = u.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === "::1"
    ) {
      return "invalid";
    }
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString().slice(0, 500);
  } catch {
    /* ignore */
  }
  return "invalid";
}

/** Pseudo : lettres/chiffres/_/-/espace, 3–20 caractères. */
export function cleanPseudo(v: unknown): string | null {
  const s = String(v ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_\- À-ÿ]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 20);
  return s.length >= 3 ? s : null;
}

/** Email minimal. */
export function cleanEmail(v: unknown): string | null {
  const s = String(v ?? "").toLowerCase().trim().slice(0, 254);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : null;
}

/** Masque toute info sensible (URL de connexion, mots de passe) dans un message d'erreur. */
export function redactError(e: unknown): string {
  let msg = e instanceof Error ? e.message : String(e);
  msg = msg.replace(/postgres(ql)?:\/\/\S+/gi, "postgresql://***");
  msg = msg.replace(/password=[^\s&]+/gi, "password=***");
  return msg.slice(0, 180);
}

/** Entier borné, sinon null. */
export function intIn(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}
