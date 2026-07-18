import { auth } from "@/auth";
import GameClient from "@/components/GameClient";
import Landing from "@/components/Landing";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  let authed = false;
  let banned = false;
  try {
    const session = await auth();
    banned = !!session?.user?.banned;
    authed = !!session?.user;
  } catch {
    // Base injoignable : on montre la vitrine plutôt qu'une erreur serveur.
    authed = false;
  }

  if (banned) redirect("/banni");
  return authed ? <GameClient /> : <Landing />;
}
