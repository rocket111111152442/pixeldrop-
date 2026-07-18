import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cleanEmail } from "@/lib/security";

const ADMIN_PASSWORD_MIN_LENGTH = 8;

export function isConfiguredAdminLogin(email: string, password: string) {
  const adminEmail = cleanEmail(process.env.ADMIN_EMAIL);
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  return (
    !!adminEmail &&
    email === adminEmail &&
    adminPassword.length >= ADMIN_PASSWORD_MIN_LENGTH &&
    password === adminPassword
  );
}

export async function ensureConfiguredAdminUser(email: string, password: string) {
  if (!isConfiguredAdminLogin(email, password)) return null;

  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { email },
      data: {
        hashedPassword,
        isAdmin: true,
        emailVerified: new Date(),
        banned: false,
        banExpiresAt: null,
        banReason: null,
        banCategory: null,
        banSource: null,
        banSeverity: null,
        banAppealDeadline: null,
        banAppealText: null,
        banAppealedAt: null,
        banAppealStatus: "none",
        banDeleteAfter: null,
      },
    });
  }

  const pseudoBase = process.env.ADMIN_PSEUDO || "Admin";
  let pseudo = pseudoBase;
  if (await prisma.user.findFirst({ where: { pseudo } })) {
    pseudo = `${pseudoBase}_${Math.random().toString(36).slice(2, 6)}`;
  }

  return prisma.user.create({
    data: {
      email,
      hashedPassword,
      emailVerified: new Date(),
      pseudo,
      name: pseudo,
      isAdmin: true,
      credits: 1_000_000,
      freeGranted: false,
    },
  });
}
