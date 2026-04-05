import { AppShell } from "@/components/shell/app-shell";
import { requireAppContext } from "@/lib/auth/session";

export default async function DockClaimAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireAppContext();

  return <AppShell context={context}>{children}</AppShell>;
}
