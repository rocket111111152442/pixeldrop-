import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cleanEmail, redactError } from "@/lib/security";
import { isMailConfigured } from "@/lib/mailer";
import {
  createAndSendEmailCode,
  EMAIL_CODE_EXPIRES_IN_MINUTES,
  type EmailVerificationPurpose,
} from "@/lib/email-verification";
import { ipOf, rateLimit, tooMany } from "@/lib/rate-limit";
import {
  ensureConfiguredAdminUser,
  isConfiguredAdminLogin,
} from "@/lib/admin-recovery";

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
  const adminDirectLogin = isConfiguredAdminLogin(email, password);
  if (
    !adminDirectLogin &&
    !rateLimit(`email-code:${purpose}:${ipOf(req)}:${email}`, 5, 10 * 60_000)
  ) {
    return tooMany();
  }

  let user = await prisma.user.findUnique({
    where: { email },
    select: {
      hashedPassword: true,
      emailVerified: true,
    },
  });
  if (!user?.hashedPassword) {
    user = await ensureConfiguredAdminUser(email, password);
  }
  if (!user?.hashedPassword) return invalidCredentials();

  const ok = await bcrypt.compare(password, user.hashedPassword);
  if (!ok) {
    user = await ensureConfiguredAdminUser(email, password);
    if (!user?.hashedPassword) return invalidCredentials();
  }

  if (purpose === "register" && user.emailVerified) {
    return NextResponse.json(
      { error: "Cette adresse est deja verifiee. Connecte-toi directement." },
      { status: 409 },
    );
  }

  if (adminDirectLogin) {
    return NextResponse.json({
      ok: true,
      adminDirect: true,
    });
  }

  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "L'envoi d'email n'est pas encore configure." },
      { status: 503 },
    );
  }

  try {
    await createAndSendEmailCode(email, purpose);
  } catch (e) {
    console.error("email-verification send failed", redactError(e));
    return NextResponse.json(
      { error: "Impossible d'envoyer le code de vérification pour le moment." },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true,
    verificationRequired: true,
    expiresInMinutes: EMAIL_CODE_EXPIRES_IN_MINUTES,
  });
}
