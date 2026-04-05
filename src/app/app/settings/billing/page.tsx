import { BillingCheckoutButton } from "@/components/app/forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireAppContext } from "@/lib/auth/session";
import { getSubscriptionPresentation } from "@/lib/billing";

export default async function BillingPage() {
  const context = await requireAppContext();
  const billing = getSubscriptionPresentation(context.subscription, context.authMode);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="One monthly DockClaim subscription."
        description="Stripe checkout is optional in local development. When Stripe is absent or misconfigured, this page stays informative instead of breaking."
      />

      <Card>
        <CardHeader>
          <CardTitle>DockClaim Pro</CardTitle>
          <CardDescription>One brokerage workspace, team invites, claims dashboard, evidence review, and billing workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="surface-subtle rounded-2xl p-4">
            <p className="text-fluid-sm text-[var(--muted-foreground)]">Current status</p>
            <p className="font-operational text-fluid-2xl mt-2 font-semibold">{billing.status.replace(/_/g, " ")}</p>
            <p className="text-fluid-sm mt-2 text-[var(--muted-foreground)]">
              {billing.trialActive
                ? `Trial ends ${billing.trialEndsAt?.toLocaleDateString()}`
                : billing.active
                  ? `Renews ${billing.currentPeriodEnd?.toLocaleDateString() ?? "with Stripe"}`
                  : billing.configured
                    ? "Subscription required to continue after trial."
                    : "Billing not configured in this environment."}
            </p>
          </div>
          {billing.configured ? (
            <BillingCheckoutButton />
          ) : (
            <p className="text-fluid-sm text-[var(--muted-foreground)]">
              Stripe keys are missing, so checkout is disabled and the app remains usable for local or demo workflows.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
