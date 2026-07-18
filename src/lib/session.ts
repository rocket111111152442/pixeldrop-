import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { refreshUserModerationState } from "@/lib/moderation";
import type { User } from "@prisma/client";

// Récupère l'utilisateur complet (données fraîches) à partir de la session.
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return refreshUserModerationState(user);
}

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return !!adminEmail && user.email?.toLowerCase() === adminEmail;
}
