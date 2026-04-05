import { CustomerForm } from "@/components/app/forms";
import { CustomersTable } from "@/components/app/tables";
import { PageHeader } from "@/components/ui/page-header";
import { getAppCollections } from "@/lib/data";
import { requireAppContext } from "@/lib/auth/session";

export default async function CustomersPage() {
  const context = await requireAppContext();
  const { customers } = await getAppCollections(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title="Customer billing relationships that back every claim."
        description="Keep billing emails, status, and notes tied to the same claim workflow as load evidence."
      />
      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <CustomerForm />
        <CustomersTable
          rows={customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            billingEmail: customer.billingEmail ?? "Not set",
            status: customer.status,
          }))}
        />
      </div>
    </div>
  );
}
