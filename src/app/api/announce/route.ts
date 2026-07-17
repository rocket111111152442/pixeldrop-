import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Annonce globale (bandeau) définie par l'admin — lecture publique.
export async function GET() {
  try {
    const s = await prisma.setting.findUnique({ where: { key: "announcement" } });
    return NextResponse.json(
      { text: s?.value || "" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ text: "" });
  }
}
