import Link from "next/link";

import { ClaimStatusForm, InternalNoteForm, SendClaimEmailButton } from "@/components/app/forms";
import { StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getClaimDetail } from "@/lib/data";
import { requireAppContext } from "@/lib/auth/session";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAppContext();
  const claim = await getClaimDetail(context.organization.id, id);
  const draftMessage = claim.messages.find((message) => message.direction === "OUTBOUND");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Claim detail"
        title={<span className="font-operational">{claim.claimNumber}</span>}
        description={`${claim.customer.name} • Load ${claim.load.externalLoadNumber} • ${formatCurrency(Number(claim.totalAmount))}`}
        actions={
          <div className="flex gap-3">
            <SendClaimEmailButton claimId={claim.id} />
            <Link href={`/api/claims/${claim.id}/pdf`} target="_blank">
              <Button type="button" variant="outline">
                Download PDF
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Claim summary</CardTitle>
                  <CardDescription>Line items, evidence-backed math, and current workflow state.</CardDescription>
                </div>
                <StatusBadge value={claim.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {claim.lineItems.map((lineItem) => (
                <div className="surface-subtle rounded-2xl p-4" key={lineItem.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{lineItem.accessorialType}</span>
                    <span className="font-operational">{formatCurrency(Number(lineItem.amount))}</span>
                  </div>
                  <p className="text-fluid-sm mt-2 text-[var(--muted-foreground)]">{lineItem.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {claim.load.stops.map((stop) => (
                <div className="surface-subtle rounded-2xl border p-4" key={stop.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {stop.type} • {stop.facilityName}
                    </span>
                    <Badge variant="secondary">{stop.timezone}</Badge>
                  </div>
                  <p className="text-fluid-sm mt-2 text-[var(--muted-foreground)]">
                    Check in <span className="font-operational">{formatDateTime(stop.checkInTime)}</span> • Departure{" "}
                    <span className="font-operational">{formatDateTime(stop.departureTime)}</span>
                  </p>
                </div>
              ))}
              {claim.load.documents.map((document) => (
                <div className="surface-subtle rounded-2xl border p-4" key={document.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{document.fileName}</span>
                    <StatusBadge value={document.extractionStatus} />
                  </div>
                  <p className="text-fluid-sm mt-2 text-[var(--muted-foreground)]">{document.documentType ?? "OTHER"}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="surface-subtle rounded-2xl p-4">
                <p className="font-semibold">{draftMessage?.subject ?? "Draft subject pending"}</p>
                <pre className="text-fluid-sm mt-3 whitespace-pre-wrap font-[family-name:var(--font-body)] text-[var(--muted-foreground)]">
                  {draftMessage?.body ?? "Create or refresh the claim to generate a draft email."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status transitions</CardTitle>
            </CardHeader>
            <CardContent>
              <ClaimStatusForm claimId={claim.id} defaultStatus={claim.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Internal notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InternalNoteForm claimId={claim.id} />
              {claim.messages
                .filter((message) => message.direction === "INTERNAL")
                .map((message) => (
                  <div className="surface-subtle rounded-2xl p-4" key={message.id}>
                    <p className="font-semibold">{message.subject}</p>
                    <p className="text-fluid-sm mt-2 text-[var(--muted-foreground)]">{message.body}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
