import { redirect } from "next/navigation";
import { getCurrentUser, isAdminUser } from "@/lib/session";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminUser(user)) redirect("/");
  return <AdminDashboard />;
}
