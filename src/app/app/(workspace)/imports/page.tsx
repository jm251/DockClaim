import { ImportWizard } from "@/components/app/forms";
import { PageHeader } from "@/components/ui/page-header";
import { requireAppContext } from "@/lib/auth/session";
import { getAppCollections } from "@/lib/data";

export default async function ImportsPage() {
  const context = await requireAppContext();
  const { templates } = await getAppCollections(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CSV imports"
        title="Turn exported load files into claimable freight events."
        description="Preview rows, map columns, and save templates so your ops team doesn't remap every file."
      />
      <ImportWizard
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          mappingJson: template.mappingJson as Record<string, string>,
        }))}
      />
    </div>
  );
}
