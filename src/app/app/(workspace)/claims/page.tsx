import { ClaimsTable } from "@/components/app/tables";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getAppCollections } from "@/lib/data";
import { requireAppContext } from "@/lib/auth/session";

export default async function ClaimsPage() {
  const context = await requireAppContext();
  const { claims } = await getAppCollections(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Claims"
        title="Claim queue from draft to paid."
        description="Track line items, message history, status transitions, and claim aging without losing evidence context."
      />
      {claims.length ? (
        <ClaimsTable
          rows={claims.map((claim) => ({
            id: claim.id,
            claimNumber: claim.claimNumber,
            customer: claim.customer.name,
            loadNumber: claim.load.externalLoadNumber,
            status: claim.status,
            totalAmount: Number(claim.totalAmount),
          }))}
        />
      ) : (
        <EmptyState title="No claims yet" description="Create a claim from an eligible load once evidence and rules line up." />
      )}
    </div>
  );
}
