import { Sidebar } from "@/components/shell/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getSubscriptionPresentation } from "@/lib/billing";

export async function AppShell({
  context,
  children,
}: {
  context: {
    authMode: "demo" | "supabase";
    organization: { name: string };
    membership: { role: string };
    subscription: {
      status: string;
      trialEndsAt: Date | null;
      currentPeriodEnd: Date | null;
    } | null;
  };
  children: React.ReactNode;
}) {
  const billing = getSubscriptionPresentation(context.subscription, context.authMode);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6 lg:flex-row lg:gap-6 lg:px-6">
      <Sidebar
        authMode={context.authMode}
        organizationName={context.organization.name}
        role={context.membership.role}
      />
      <main className="min-w-0 flex-1 space-y-5 lg:space-y-6">
        <Card className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <div>
            <p className="text-eyebrow text-[var(--muted-foreground)]">Workspace status</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={billing.active || billing.trialActive ? "success" : "warning"}>
                {billing.active ? "Subscription active" : billing.trialActive ? "Trial active" : "Billing needs attention"}
              </Badge>
              <Badge variant="secondary">{context.membership.role}</Badge>
            </div>
          </div>
          <div className="text-fluid-sm text-[var(--muted-foreground)]">
            {billing.trialActive
              ? `Trial ends ${billing.trialEndsAt?.toLocaleDateString()}`
              : billing.configured
                ? "Billing connected"
                : "Billing not configured"}
          </div>
        </Card>
        {children}
      </main>
    </div>
  );
}
