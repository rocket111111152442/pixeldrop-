import { getCurrentUser, isAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  // Neutralise l'injection de formule tableur + échappe les guillemets.
  const safe = /^[=+\-@]/.test(s) ? "'" + s : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Export CSV des comptes (admin).
export async function GET() {
  const me = await getCurrentUser();
  if (!isAdminUser(me)) return new Response("Accès refusé", { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      pseudo: true, email: true, credits: true, totalPlaced: true,
      totalSpentCts: true, level: true, banned: true, muted: true, createdAt: true,
    },
  });

  const header = "pseudo;email;credits;poses;depense_eur;niveau;banni;muet;inscription";
  const rows = users.map((u) =>
    [
      csvCell(u.pseudo), csvCell(u.email), u.credits, u.totalPlaced,
      (u.totalSpentCts / 100).toFixed(2), u.level,
      u.banned ? "oui" : "non", u.muted ? "oui" : "non",
      u.createdAt.toISOString().slice(0, 10),
    ].join(";"),
  );

  return new Response([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pixeldrop-comptes.csv"',
    },
  });
}
