import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import BannedClient from "@/components/BannedClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Compte banni",
};

export default async function BanniPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.banned) redirect("/");

  return (
    <BannedClient
      reason={user.banReason || "Sanction de modération."}
      category={user.banCategory}
      severity={user.banSeverity}
      bannedAt={user.bannedAt?.toISOString() || null}
      expiresAt={user.banExpiresAt?.toISOString() || null}
      appealDeadline={user.banAppealDeadline?.toISOString() || null}
      appealStatus={user.banAppealStatus}
      appealText={user.banAppealText}
      deleteAfter={user.banDeleteAfter?.toISOString() || null}
    />
  );
}
