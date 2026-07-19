import net from "node:net";
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DAY_MS = 86_400_000;
const APPEAL_WINDOW_MS = 24 * 60 * 60 * 1000;

type ModerationDecision = "allow" | "review" | "ban";
export type ModerationSeverity = "review" | "temporary_ban" | "permanent_ban";
export type ModerationTargetType = "pixel" | "chat" | "user" | "appeal";

export type ModerationVerdict = {
  decision: ModerationDecision;
  severity: ModerationSeverity;
  category: string;
  reason: string;
  details: string[];
  banDays?: number;
  autoDeleteAfterAppeal?: boolean;
};

type ModerationInput = {
  targetType: "pixel" | "chat";
  text?: string | null;
  link?: string | null;
};

type ModerationContext = {
  userId: string;
  source?: "bot" | "admin" | "user" | "appeal";
  targetType: ModerationTargetType;
  targetId?: string | null;
  x?: number | null;
  y?: number | null;
  text?: string | null;
  link?: string | null;
  adminId?: string | null;
};

const SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "urlz.fr",
]);

const ADULT_URL_TERMS = [
  "porn",
  "porno",
  "xvideos",
  "pornhub",
  "redtube",
  "youporn",
  "xnxx",
  "xhamster",
  "onlyfans",
  "hentai",
  "escort",
  "camgirl",
];

const MALICIOUS_URL_TERMS = [
  "phishing",
  "malware",
  "ransomware",
  "keylogger",
  "trojan",
  "stealer",
  "wallet-drainer",
  "walletdrainer",
  "grabber",
  "free-nitro",
  "discord-gift",
  "login-verify",
  "verify-wallet",
  "airdrop-free",
];

const ILLEGAL_TERMS = [
  "vente drogue",
  "acheter drogue",
  "faux papiers",
  "carte bancaire volee",
  "numero de carte volee",
  "arme illegale",
  "explosif maison",
  "terrorisme",
];

const ADULT_TEXT_TERMS = [
  "porno",
  "pornographie",
  "contenu adulte",
  "site adulte",
  "onlyfans",
  "escort",
  "camgirl",
  "hentai",
];

const SCAM_TEXT_TERMS = [
  "phishing",
  "malware",
  "ransomware",
  "keylogger",
  "trojan",
  "voler ton compte",
  "wallet drainer",
  "donne ton mot de passe",
  "carte bancaire",
];

const THREAT_TERMS = [
  "je vais te tuer",
  "je vais te frapper",
  "menace de mort",
  "va mourir",
  "dox",
  "doxx",
  "adresse de ",
];

const INSULT_TERMS = [
  "abruti",
  "batard",
  "bâtard",
  "bete",
  "bête",
  "boloss",
  "bouffon",
  "cas social",
  "cassos",
  "clochard",
  "con",
  "conne",
  "couillon",
  "couillonne",
  "connard",
  "connasse",
  "cretin",
  "crétin",
  "debile",
  "débile",
  "enculé",
  "salope",
  "pute",
  "fdp",
  "encule",
  "enculer",
  "encules",
  "enculez",
  "enculee",
  "enculée",
  "enclule",
  "enclules",
  "ferme ta gueule",
  "fils de pute",
  "fils2pute",
  "gogole",
  "gros con",
  "grosse merde",
  "imbecile",
  "imbécile",
  "mange tes morts",
  "mongol",
  "nique ta mere",
  "nique ta mère",
  "nique ta race",
  "nik ta mere",
  "nik ta mère",
  "ntm",
  "pd",
  "petasse",
  "pétasse",
  "poufiasse",
  "sale con",
  "sale merde",
  "sale pute",
  "ta gueule",
  "tg",
  "tocard",
  "trou du cul",
  "va te faire foutre",
  "vtff",
];

const INSULT_PATTERNS: { label: string; pattern: RegExp }[] = [
  {
    label: "injure explicite",
    pattern: /(^|[^a-z0-9])enc(?:u|lu)l[a-z0-9]*($|[^a-z0-9])/i,
  },
  {
    label: "injure explicite",
    pattern: /(^|[^a-z0-9])f(?:i|1)?l?s?[^a-z0-9]*d(?:e|2)?[^a-z0-9]*p(?:u|0)te?s?($|[^a-z0-9])/i,
  },
  {
    label: "injure explicite",
    pattern: /(^|[^a-z0-9])n(?:i|1)q(?:u|v)?e?[^a-z0-9]*ta[^a-z0-9]*(?:mere|race)($|[^a-z0-9])/i,
  },
];

const COMPACT_INSULT_TERMS = [
  "abruti",
  "batard",
  "boloss",
  "bouffon",
  "cassos",
  "connard",
  "connasse",
  "couillon",
  "debile",
  "encule",
  "enculer",
  "encules",
  "enculez",
  "enculee",
  "enclule",
  "fdp",
  "filsdepute",
  "fils2pute",
  "fermetagueule",
  "gogole",
  "groscon",
  "grossemerde",
  "imbecile",
  "mangetesmorts",
  "niquetamere",
  "niquetarace",
  "niktamere",
  "ntm",
  "petasse",
  "poufiasse",
  "salecon",
  "salemerde",
  "salepute",
  "tagueule",
  "tocard",
  "trouducul",
  "vatefairefoutre",
  "vtff",
];

const COMPACT_INSULT_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "injure compacte", pattern: /encul[a-z0-9]*/i },
  { label: "injure compacte", pattern: /enclul[a-z0-9]*/i },
  { label: "injure compacte", pattern: /fils?d[e2]?putes?/i },
  { label: "injure compacte", pattern: /ni?q[u]?e?ta(?:mere|race)/i },
  { label: "injure compacte", pattern: /(?:sale|gros|grosse)?merdes?/i },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function deobfuscateText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[!1]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[$5]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[8]/g, "b")
    .replace(/([a-z0-9])\1{2,}/g, "$1$1");
}

function normalizeText(value: string): string {
  return deobfuscateText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string): string {
  return normalizeText(value).replace(/\s+/g, "");
}

function hasAny(haystack: string, terms: string[]): string | null {
  const loose = deobfuscateText(haystack);
  const normalized = normalizeText(haystack);
  const bounded = ` ${normalized} `;

  for (const term of terms) {
    const n = normalizeText(term);
    if (!n) continue;
    if (bounded.includes(` ${n} `)) return term;

    const words = n.split(" ").filter(Boolean);
    const fuzzy = words
      .map((word) => [...word].map(escapeRegExp).join("[^a-z0-9]*"))
      .join("[^a-z0-9]+");
    if (new RegExp(`(^|[^a-z0-9])${fuzzy}($|[^a-z0-9])`, "i").test(loose)) {
      return term;
    }
  }
  return null;
}

function hasPattern(haystack: string, patterns: { label: string; pattern: RegExp }[]) {
  const loose = deobfuscateText(haystack);
  for (const item of patterns) {
    if (item.pattern.test(loose)) return item.label;
  }
  return null;
}

function hasCompactAny(haystack: string, terms: string[]): string | null {
  const compact = compactText(haystack);
  for (const term of terms) {
    const n = compactText(term);
    if (!n) continue;
    if (compact.includes(n)) return term;
  }
  return null;
}

function hasCompactPattern(
  haystack: string,
  patterns: { label: string; pattern: RegExp }[],
) {
  const compact = compactText(haystack);
  for (const item of patterns) {
    if (item.pattern.test(compact)) return item.label;
  }
  return null;
}

function hasShortInsultToken(haystack: string): string | null {
  const normalized = ` ${normalizeText(haystack)} `;
  const compact = compactText(haystack);
  if (/(^| )f d p($| )/.test(normalized) || compact === "fdp") return "fdp";
  if (/(^| )n t m($| )/.test(normalized) || compact === "ntm") return "ntm";
  if (/(^| )t g($| )/.test(normalized) || compact === "tg") return "tg";
  if (/(^| )p d($| )/.test(normalized) || compact === "pd") return "pd";
  return null;
}

function extractUrls(value: string | null | undefined): string[] {
  if (!value) return [];
  const matches = value.match(/https?:\/\/[^\s<>"'`]+/gi) || [];
  return matches.map((u) => u.replace(/[),.;!?]+$/g, "")).slice(0, 8);
}

function cleanHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "");
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = cleanHostname(hostname);
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  ) {
    return true;
  }
  const ipType = net.isIP(h);
  if (ipType === 4) {
    const parts = h.split(".").map((p) => Number(p));
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }
  if (ipType === 6) {
    return h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80");
  }
  return false;
}

function verdict(
  decision: ModerationDecision,
  severity: ModerationSeverity,
  category: string,
  reason: string,
  details: string[],
  options: { banDays?: number; autoDeleteAfterAppeal?: boolean } = {},
): ModerationVerdict {
  return { decision, severity, category, reason, details, ...options };
}

function strongest(a: ModerationVerdict, b: ModerationVerdict): ModerationVerdict {
  const decisionRank: Record<ModerationDecision, number> = {
    allow: 0,
    review: 1,
    ban: 2,
  };
  const rank: Record<ModerationSeverity, number> = {
    review: 1,
    temporary_ban: 2,
    permanent_ban: 3,
  };
  if (decisionRank[b.decision] > decisionRank[a.decision]) return b;
  if (rank[b.severity] > rank[a.severity]) return b;
  if (rank[b.severity] === rank[a.severity] && b.details.length > a.details.length) {
    return { ...a, details: [...a.details, ...b.details] };
  }
  return a;
}

function moderateUrl(raw: string): ModerationVerdict {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return verdict("review", "review", "url_invalide", "URL invalide ou illisible.", [raw]);
  }

  const host = cleanHostname(parsed.hostname);
  const full = normalizeText(`${host} ${parsed.pathname} ${parsed.search}`);

  if (isPrivateOrLocalHost(host)) {
    return verdict(
      "ban",
      "permanent_ban",
      "url_malveillante",
      "Lien vers une adresse interne ou locale interdite.",
      [`URL bloquee: ${raw}`],
      { autoDeleteAfterAppeal: true },
    );
  }

  const adult = hasAny(full, ADULT_URL_TERMS);
  if (adult) {
    return verdict(
      "ban",
      "permanent_ban",
      "contenu_pornographique",
      "Lien vers un contenu pornographique interdit.",
      [`Mot-cle URL: ${adult}`],
      { autoDeleteAfterAppeal: true },
    );
  }

  const malicious = hasAny(full, MALICIOUS_URL_TERMS);
  if (malicious) {
    return verdict(
      "ban",
      "permanent_ban",
      "url_malveillante",
      "Lien malveillant ou hameconnage detecte.",
      [`Mot-cle URL: ${malicious}`],
      { autoDeleteAfterAppeal: true },
    );
  }

  const illegal = hasAny(full, ILLEGAL_TERMS);
  if (illegal) {
    return verdict(
      "ban",
      "permanent_ban",
      "contenu_illegal",
      "Contenu illegal detecte.",
      [`Mot-cle illegal: ${illegal}`],
      { autoDeleteAfterAppeal: true },
    );
  }

  if (SHORTENERS.has(host)) {
    return verdict(
      "review",
      "review",
      "url_suspecte",
      "Lien raccourci a verifier par un administrateur.",
      [`Raccourcisseur: ${host}`],
    );
  }

  if (parsed.protocol !== "https:") {
    return verdict(
      "review",
      "review",
      "url_suspecte",
      "Lien non securise a verifier par un administrateur.",
      [`Protocole: ${parsed.protocol}`],
    );
  }

  return verdict("allow", "review", "ok", "OK", []);
}

export function moderateContent(input: ModerationInput): ModerationVerdict {
  let out = verdict("allow", "review", "ok", "OK", []);
  const text = input.text || "";
  const urls = [input.link, ...extractUrls(input.text)].filter(Boolean) as string[];

  for (const url of urls) {
    out = strongest(out, moderateUrl(url));
  }

  const adult = hasAny(text, ADULT_TEXT_TERMS);
  if (adult) {
    out = strongest(
      out,
      verdict(
        "ban",
        "permanent_ban",
        "contenu_pornographique",
        "Contenu pornographique interdit.",
        [`Mot-cle texte: ${adult}`],
        { autoDeleteAfterAppeal: true },
      ),
    );
  }

  const scam = hasAny(text, SCAM_TEXT_TERMS);
  if (scam) {
    out = strongest(
      out,
      verdict(
        "ban",
        "permanent_ban",
        "contenu_malveillant",
        "Contenu malveillant ou hameconnage detecte.",
        [`Mot-cle texte: ${scam}`],
        { autoDeleteAfterAppeal: true },
      ),
    );
  }

  const illegal = hasAny(text, ILLEGAL_TERMS);
  if (illegal) {
    out = strongest(
      out,
      verdict(
        "ban",
        "permanent_ban",
        "contenu_illegal",
        "Contenu illegal detecte.",
        [`Mot-cle texte: ${illegal}`],
        { autoDeleteAfterAppeal: true },
      ),
    );
  }

  const threat = hasAny(text, THREAT_TERMS);
  if (threat) {
    out = strongest(
      out,
      verdict(
        "ban",
        "temporary_ban",
        "menace",
        "Menace ou intimidation detectee.",
        [`Mot-cle menace: ${threat}`],
        { banDays: 90 },
      ),
    );
  }

  const insult =
    hasAny(text, INSULT_TERMS) ||
    hasPattern(text, INSULT_PATTERNS) ||
    hasCompactAny(text, COMPACT_INSULT_TERMS) ||
    hasCompactPattern(text, COMPACT_INSULT_PATTERNS) ||
    hasShortInsultToken(text);
  if (insult) {
    out = strongest(
      out,
      verdict(
        "ban",
        "temporary_ban",
        "insulte",
        "Insulte ou injure detectee.",
        [`Mot-cle injure: ${insult}`],
        { banDays: 30 },
      ),
    );
  }

  if (out.decision === "allow" && urls.length > 3) {
    return verdict(
      "review",
      "review",
      "spam_suspect",
      "Plusieurs liens detectes, verification admin requise.",
      [`Nombre de liens: ${urls.length}`],
    );
  }

  return out;
}

export async function moderateVisibleChatMessages(limit = 500) {
  const messages = await prisma.chatMessage.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { isAdmin: true } } },
  });

  let cleaned = 0;
  for (const message of messages) {
    if (message.user.isAdmin) continue;
    const moderation = moderateContent({ targetType: "chat", text: message.text });
    if (moderation.decision === "allow") continue;

    await prisma.chatMessage.updateMany({
      where: { id: message.id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedReason: moderation.reason,
        deletedById: "moderation-bot",
      },
    });
    await applyModerationVerdict({
      userId: message.userId,
      source: "bot",
      targetType: "chat",
      targetId: message.id,
      text: message.text,
      verdict: moderation,
    });
    cleaned++;
  }

  return cleaned;
}

export function banDates(verdict: ModerationVerdict, now = new Date()) {
  const appealDeadline = new Date(now.getTime() + APPEAL_WINDOW_MS);
  const temporaryUntil =
    verdict.severity === "temporary_ban"
      ? new Date(now.getTime() + (verdict.banDays || 30) * DAY_MS)
      : null;

  return {
    bannedAt: now,
    banExpiresAt: temporaryUntil,
    banAppealDeadline: appealDeadline,
    banDeleteAfter:
      verdict.severity === "permanent_ban" && verdict.autoDeleteAfterAppeal
        ? appealDeadline
        : null,
  };
}

export async function recordModerationCase(
  data: ModerationContext & {
    verdict: ModerationVerdict;
    action?: string;
    status?: string;
  },
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.moderationCase.create({
    data: {
      source: data.source || "bot",
      targetType: data.targetType,
      targetId: data.targetId || null,
      userId: data.userId,
      x: data.x ?? null,
      y: data.y ?? null,
      link: data.link || null,
      text: data.text || null,
      category: data.verdict.category,
      severity: data.verdict.severity,
      action: data.action || (data.verdict.decision === "ban" ? "banned" : "reported"),
      reason: data.verdict.reason,
      details: data.verdict.details.join("\n") || null,
      status: data.status || "open",
      resolvedById: data.adminId || null,
    },
  });
}

export async function applyModerationVerdict(
  context: ModerationContext & { verdict: ModerationVerdict },
): Promise<ModerationVerdict> {
  const { verdict: v } = context;
  if (v.decision === "allow") return v;

  await prisma.$transaction(async (tx) => {
    await recordModerationCase(
      {
        ...context,
        action: v.decision === "ban" ? "banned" : "blocked",
      },
      tx,
    );

    if (v.decision === "ban") {
      const dates = banDates(v);
      await tx.user.update({
        where: { id: context.userId },
        data: {
          banned: true,
          muted: true,
          bannedAt: dates.bannedAt,
          banExpiresAt: dates.banExpiresAt,
          banReason: v.reason,
          banCategory: v.category,
          banSource: context.source || "bot",
          banSeverity: v.severity,
          banAppealDeadline: dates.banAppealDeadline,
          banAppealText: null,
          banAppealedAt: null,
          banAppealStatus: "none",
          banDeleteAfter: dates.banDeleteAfter,
        },
      });
    }
  });

  return v;
}

export async function refreshUserModerationState(user: User): Promise<User | null> {
  const now = new Date();

  if (
    user.banned &&
    user.banDeleteAfter &&
    user.banDeleteAfter <= now &&
    user.banAppealStatus === "none" &&
    !user.isAdmin
  ) {
    await prisma.moderationCase.create({
      data: {
        source: "bot",
        targetType: "user",
        targetId: user.id,
        userId: user.id,
        status: "resolved",
        category: user.banCategory || "suppression_automatique",
        severity: "permanent_ban",
        action: "account_deleted",
        reason: "Compte supprime automatiquement apres 24h sans contestation.",
        details: user.banReason || null,
        resolvedAt: now,
      },
    });
    await prisma.user.delete({ where: { id: user.id } });
    return null;
  }

  if (user.banned && user.banExpiresAt && user.banExpiresAt <= now) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        banned: false,
        muted: false,
        banReason: null,
        banCategory: null,
        banSource: null,
        banSeverity: null,
        bannedAt: null,
        banExpiresAt: null,
        banAppealDeadline: null,
        banAppealText: null,
        banAppealedAt: null,
        banAppealStatus: "none",
        banDeleteAfter: null,
      },
    });
  }

  return user;
}

export async function runModerationMaintenance() {
  const now = new Date();

  await prisma.user.updateMany({
    where: { banned: true, banExpiresAt: { lte: now } },
    data: {
      banned: false,
      muted: false,
      banReason: null,
      banCategory: null,
      banSource: null,
      banSeverity: null,
      bannedAt: null,
      banExpiresAt: null,
      banAppealDeadline: null,
      banAppealText: null,
      banAppealedAt: null,
      banAppealStatus: "none",
      banDeleteAfter: null,
    },
  });

  const expired = await prisma.user.findMany({
    where: {
      banned: true,
      isAdmin: false,
      banDeleteAfter: { lte: now },
      banAppealStatus: "none",
    },
    select: { id: true, banCategory: true, banReason: true },
    take: 50,
  });

  for (const user of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.moderationCase.create({
        data: {
          source: "bot",
          targetType: "user",
          targetId: user.id,
          userId: user.id,
          status: "resolved",
          category: user.banCategory || "suppression_automatique",
          severity: "permanent_ban",
          action: "account_deleted",
          reason: "Compte supprime automatiquement apres 24h sans contestation.",
          details: user.banReason || null,
          resolvedAt: now,
        },
      });
      await tx.user.delete({ where: { id: user.id } });
    });
  }
}

export function publicBanMessage(verdict: ModerationVerdict): string {
  if (verdict.severity === "permanent_ban") {
    return `${verdict.reason} Bannissement definitif. Tu as 24h pour contester.`;
  }
  return `${verdict.reason} Bannissement temporaire de ${verdict.banDays || 30} jours.`;
}
