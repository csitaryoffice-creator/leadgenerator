import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePageUser();
  return <AppShell email={user.email}>{children}</AppShell>;
}
