import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cleanEmail } from "@/lib/security";
import { isMailConfigured } from "@/lib/mailer";
import {
  createAndSendEmailCode,
  EMAIL_CODE_EXPIRES_IN_MINUTES,
  type EmailVerificationPurpose,
} from "@/lib/email-verification";
import { ipOf, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

function parsePurpose(value: unknown): EmailVerificationPurpose {
  return value === "register" ? "register" : "login";
}

function invalidCredentials() {
  return NextResponse.json(
    { error: "Email ou mot de passe incorrect." },
    { status: 401 },
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = cleanEmail(body.email);
  const password = String(body.password || "");
  const purpose = parsePurpose(body.purpose);

  if (!email || !password) return invalidCredentials();
  if (!rateLimit(`email-code:${purpose}:${ipOf(req)}:${email}`, 5, 10 * 60_000)) {
    return tooMany();
  }
  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "L'envoi d'email n'est pas encore configure." },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { hashedPassword: true, emailVerified: true },
  });
  if (!user?.hashedPassword) return invalidCredentials();

  const ok = await bcrypt.compare(password, user.hashedPassword);
  if (!ok) return invalidCredentials();

  if (purpose === "register" && user.emailVerified) {
    return NextResponse.json(
      { error: "Cette adresse est deja verifiee. Connecte-toi directement." },
      { status: 409 },
    );
  }

  await createAndSendEmailCode(email, purpose);
  return NextResponse.json({
    ok: true,
    verificationRequired: true,
    expiresInMinutes: EMAIL_CODE_EXPIRES_IN_MINUTES,
  });
}
