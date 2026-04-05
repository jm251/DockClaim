import { FacilitiesTable } from "@/components/app/tables";
import { FacilityForm } from "@/components/app/forms";
import { PageHeader } from "@/components/ui/page-header";
import { getAppCollections } from "@/lib/data";
import { requireAppContext } from "@/lib/auth/session";

export default async function FacilitiesPage() {
  const context = await requireAppContext();
  const { facilities, customers } = await getAppCollections(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facilities"
        title="Facilities where dwell happens and evidence gets messy."
        description="Map facilities to customers and timezones so the rules engine can apply the right accessorial policy."
      />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <FacilityForm customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))} />
        <FacilitiesTable
          rows={facilities.map((facility) => ({
            id: facility.id,
            name: facility.name,
            customer: facility.customer.name,
            timezone: facility.timezone,
          }))}
        />
      </div>
    </div>
  );
}
