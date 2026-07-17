import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/security";

// Définir / effacer le bandeau d'annonce global (admin).
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!isAdminUser(me))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const text = cleanText(body.text, 200) ?? "";

  await prisma.setting.upsert({
    where: { key: "announcement" },
    create: { key: "announcement", value: text },
    update: { value: text },
  });

  return NextResponse.json({ ok: true, text });
}
