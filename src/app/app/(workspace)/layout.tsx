import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppContext } from "@/lib/auth/session";
import { getSubscriptionPresentation } from "@/lib/billing";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireAppContext();
  const subscription = getSubscriptionPresentation(context.subscription, context.authMode);

  if (subscription.gated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing action required</CardTitle>
          <CardDescription>
            Your workspace trial has expired. Resume claim work after updating your monthly subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/app/settings/billing">
            <Button>Go to billing</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
