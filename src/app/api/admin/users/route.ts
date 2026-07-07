import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      pseudo: true,
      email: true,
      image: true,
      credits: true,
      banned: true,
      isAdmin: true,
      totalPlaced: true,
      totalSpentCts: true,
      createdAt: true,
      _count: { select: { pixels: true } },
    },
  });

  return NextResponse.json({ users });
}
