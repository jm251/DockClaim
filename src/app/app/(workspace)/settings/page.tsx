import { InviteForm } from "@/components/app/forms";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getSettingsPageData } from "@/lib/data";
import { requireAppContext } from "@/lib/auth/session";
import { relativeTime } from "@/lib/utils";

export default async function SettingsPage() {
  const context = await requireAppContext();
  const invitations = await getSettingsPageData(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Team and workspace settings."
        description="Manage teammate access, review invite state, and keep the workspace aligned with your brokerage team."
      />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <InviteForm />
        <Card>
          <CardHeader>
            <CardTitle>Pending and recent invites</CardTitle>
            <CardDescription>Teammate invitations are role-scoped and expire after seven days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map((invitation) => (
              <div className="surface-subtle rounded-2xl border p-4" key={invitation.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{invitation.email}</p>
                    <p className="text-fluid-sm text-[var(--muted-foreground)]">
                      {invitation.role} • expires {relativeTime(invitation.expiresAt)}
                    </p>
                  </div>
                  <StatusBadge value={invitation.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
