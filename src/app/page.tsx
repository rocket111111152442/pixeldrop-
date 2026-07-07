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
    // Si la base de données n'est pas joignable, on montre le portail
    // de connexion plutôt qu'un écran d'erreur serveur.
    authed = false;
  }

  return authed ? <GameClient /> : <Landing />;
}
