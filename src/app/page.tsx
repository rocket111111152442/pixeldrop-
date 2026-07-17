import { auth } from "@/auth";
import GameClient from "@/components/GameClient";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  let authed = false;
  try {
    const session = await auth();
    authed = !!session?.user;
  } catch {
    // Base injoignable : on montre la vitrine plutôt qu'une erreur serveur.
    authed = false;
  }

  return authed ? <GameClient /> : <Landing />;
}
