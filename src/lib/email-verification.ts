import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { cleanEmail } from "@/lib/security";
import { sendMail } from "@/lib/mailer";

export type EmailVerificationPurpose = "register" | "login";

export const EMAIL_CODE_EXPIRES_IN_MINUTES = 10;

const CODE_RE = /^\d{6}$/;

function identifierFor(email: string, purpose: EmailVerificationPurpose) {
  return `email-code:${purpose}:${cleanEmail(email)}`;
}

function hashEmailCode(email: string, purpose: EmailVerificationPurpose, code: string) {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "pixeldrop-dev-secret";
  return crypto
    .createHash("sha256")
    .update(`${purpose}:${cleanEmail(email)}:${code}:${secret}`)
    .digest("hex");
}

function formatCode(code: string) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

function purposeLabel(purpose: EmailVerificationPurpose) {
  return purpose === "register" ? "creation de compte" : "connexion";
}

export function cleanEmailCode(value: unknown) {
  return String(value || "").replace(/\s+/g, "").trim();
}

export async function createAndSendEmailCode(
  email: string,
  purpose: EmailVerificationPurpose,
) {
  const clean = cleanEmail(email);
  if (!clean) throw new Error("INVALID_EMAIL");

  const code = crypto.randomInt(100_000, 1_000_000).toString();
  const identifier = identifierFor(clean, purpose);
  const expires = new Date(Date.now() + EMAIL_CODE_EXPIRES_IN_MINUTES * 60_000);
  const token = hashEmailCode(clean, purpose, code);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({
      where: {
        OR: [{ identifier }, { expires: { lt: new Date() } }],
      },
    }),
    prisma.verificationToken.create({
      data: { identifier, token, expires },
    }),
  ]);

  const prettyCode = formatCode(code);
  const label = purposeLabel(purpose);
  await sendMail({
    to: clean,
    subject: `Code PebbleDrop - ${label}`,
    text: [
      `Ton code PebbleDrop est : ${prettyCode}`,
      "",
      `Il expire dans ${EMAIL_CODE_EXPIRES_IN_MINUTES} minutes.`,
      "Si tu n'es pas a l'origine de cette demande, tu peux ignorer cet email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#16291f">
        <h2 style="margin:0 0 12px">Code PebbleDrop</h2>
        <p>Voici ton code pour la ${label} :</p>
        <p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:18px 0">${prettyCode}</p>
        <p>Il expire dans ${EMAIL_CODE_EXPIRES_IN_MINUTES} minutes.</p>
        <p style="color:#5f7568;font-size:13px">Si tu n'es pas a l'origine de cette demande, ignore cet email.</p>
      </div>
    `,
  });

  return { expires };
}

export async function consumeEmailCode(
  email: string,
  purpose: EmailVerificationPurpose,
  value: unknown,
) {
  const clean = cleanEmail(email);
  const code = cleanEmailCode(value);
  if (!clean || !CODE_RE.test(code)) return false;

  const identifier = identifierFor(clean, purpose);
  const token = hashEmailCode(clean, purpose, code);
  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token,
      expires: { gt: new Date() },
    },
  });
  if (!record) return false;

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return true;
}
