import { auth } from "@/auth";
import GameClient from "@/components/GameClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PebbleDrop — La clairière",
  description: "Explore la clairière d'un million de cailloux, sans compte.",
};

// Carte publique : accessible sans compte (mode spectateur).
// Si le visiteur est connecté, il joue normalement.
export default async function CartePage() {
  let authed = false;
  let banned = false;
  try {
    const session = await auth();
    banned = !!session?.user?.banned;
    authed = !!session?.user;
  } catch {
    authed = false;
  }
  if (banned) redirect("/banni");
  return <GameClient guest={!authed} />;
}
