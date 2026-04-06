import { RuleForm } from "@/components/app/forms";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getRulesPageData } from "@/lib/data";
import { requireAppContext } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/utils";

export default async function RulesPage() {
  const context = await requireAppContext();
  const { rules, customers, facilities } = await getRulesPageData(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rules engine"
        title="Customer and facility billing policy, made explicit."
        description="Control detention rounding, layover, TONU, and lumper reimbursement with deterministic rule precedence."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <RuleForm
          customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))}
          facilities={facilities.map((facility) => ({ id: facility.id, name: facility.name }))}
        />
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{rule.name}</CardTitle>
                    <CardDescription>
                      {rule.customer?.name ?? "All customers"} • {rule.facility?.name ?? "All facilities"}
                    </CardDescription>
                  </div>
                  <StatusBadge value={rule.active ? "ACTIVE" : "INACTIVE"} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="surface-subtle rounded-2xl p-4">
                  <p className="text-eyebrow text-[var(--muted-foreground)]">Detention</p>
                  <p className="font-operational text-fluid-base mt-2">
                    {rule.detentionFreeMinutes} free min • {formatCurrency(Number(rule.detentionRatePerHour))}/hr
                  </p>
                </div>
                <div className="surface-subtle rounded-2xl p-4">
                  <p className="text-eyebrow text-[var(--muted-foreground)]">Layover / TONU</p>
                  <p className="font-operational text-fluid-base mt-2">
                    {formatCurrency(Number(rule.layoverFlatAmount))} layover • {formatCurrency(Number(rule.tonuFlatAmount))} TONU
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
