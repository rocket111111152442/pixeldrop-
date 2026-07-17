import { auth } from "@/auth";
import GameClient from "@/components/GameClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PebbleDrop — La clairière",
  description: "Explore la clairière d'un million de cailloux, sans compte.",
};

// Carte publique : accessible sans compte (mode spectateur).
// Si le visiteur est connecté, il joue normalement.
export default async function CartePage() {
  let authed = false;
  try {
    const session = await auth();
    authed = !!session?.user;
  } catch {
    authed = false;
  }
  return <GameClient guest={!authed} />;
}
