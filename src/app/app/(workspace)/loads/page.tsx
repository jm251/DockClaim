import { LoadsTable } from "@/components/app/tables";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getLoadsList } from "@/lib/data";
import { requireAppContext } from "@/lib/auth/session";
import { sumEligibleCandidates } from "@/lib/loads";

export default async function LoadsPage() {
  const context = await requireAppContext();
  const loads = await getLoadsList(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Loads"
        title="Every imported load, one review queue."
        description="Filter by customer, facility, or claim status and drill directly into evidence and billing math."
      />
      {loads.length ? (
        <LoadsTable
          rows={loads.map((load) => ({
            id: load.id,
            externalLoadNumber: load.externalLoadNumber,
            customer: load.customer.name,
            facility: load.facility?.name ?? "Unassigned",
            status: load.status,
            potential: sumEligibleCandidates(load.candidates),
            claimStatus: load.claim?.status ?? "DRAFT",
          }))}
        />
      ) : (
        <EmptyState title="No loads yet" description="Import a CSV to create your first DockClaim review queue." />
      )}
    </div>
  );
}
