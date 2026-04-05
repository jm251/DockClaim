import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboardData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { requireAppContext } from "@/lib/auth/session";

export default async function DashboardPage() {
  const context = await requireAppContext();
  const dashboard = await getDashboardData(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue recovery"
        title="Claims that would otherwise die in spreadsheets."
        description="Monitor potential recovery, open aging, and the facilities or customers driving the most missed accessorial revenue."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          title="Potential this month"
          value={formatCurrency(dashboard.totalPotentialClaimsThisMonth)}
          hint="Eligible unclaimed accessorials tied to this month’s delivered loads."
        />
        <StatCard
          title="Sent this month"
          value={formatCurrency(dashboard.totalSentThisMonth)}
          hint="Claims that have already gone out the door."
        />
        <StatCard
          title="Recovered this month"
          value={formatCurrency(dashboard.totalRecoveredThisMonth)}
          hint="Cash collected against sent claims."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open claim aging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(dashboard.aging).map(([bucket, count]) => (
              <div className="surface-subtle flex items-center justify-between rounded-2xl px-4 py-3" key={bucket}>
                <span className="text-fluid-sm text-[var(--foreground-soft)]">{bucket}</span>
                <span className="font-operational font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top facilities by dwell</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.topFacilitiesByDwell.map((facility) => (
              <div className="surface-subtle flex items-center justify-between rounded-2xl px-4 py-3" key={facility.id}>
                <span className="text-fluid-sm">{facility.name}</span>
                <span className="font-operational font-semibold">{Math.round(facility.dwellMinutes)} min</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top customers by recovered amount</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.topCustomersByRecoveredAmount.map((customer) => (
            <div className="surface-subtle rounded-2xl p-4" key={customer.id}>
              <div className="text-fluid-sm text-[var(--muted-foreground)]">{customer.name}</div>
              <div className="font-operational text-fluid-xl mt-2 font-semibold">{formatCurrency(customer.recoveredAmount)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
