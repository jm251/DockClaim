import Link from "next/link";

import { createClaimAction, uploadDocumentAction } from "@/app/actions";
import { DocumentReviewForm } from "@/components/app/forms";
import { StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { extractionSchema } from "@/lib/providers/ai";
import { getLoadDetail } from "@/lib/data";
import { requireAppContext } from "@/lib/auth/session";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/utils";

export default async function LoadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAppContext();
  const load = await getLoadDetail(context.organization.id, id);

  async function createClaimForLoad() {
    "use server";

    await createClaimAction(load.id);
  }

  async function uploadDocumentForLoad(formData: FormData) {
    "use server";

    await uploadDocumentAction(formData);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Load detail"
        title={
          <>
            Load <span className="font-operational">{load.externalLoadNumber}</span>
          </>
        }
        description={`${load.customer.name} • ${load.facility?.name ?? "No linked facility"} • Delivered ${formatDateOnly(load.deliveryDate)}`}
        actions={
          <form action={createClaimForLoad}>
            <SubmitButton type="submit">Create or update claim</SubmitButton>
          </form>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Customer, carrier, scheduling dates, and current claim workflow state.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="surface-subtle rounded-2xl p-4">
                <p className="text-eyebrow text-[var(--muted-foreground)]">Customer</p>
                <p className="text-fluid-base mt-2 font-semibold">{load.customer.name}</p>
              </div>
              <div className="surface-subtle rounded-2xl p-4">
                <p className="text-eyebrow text-[var(--muted-foreground)]">Carrier</p>
                <p className="text-fluid-base mt-2 font-semibold">{load.carrier?.name ?? "Unassigned"}</p>
              </div>
              <div className="surface-subtle rounded-2xl p-4">
                <p className="text-eyebrow text-[var(--muted-foreground)]">Pickup</p>
                <p className="font-operational text-fluid-base mt-2 font-semibold">{formatDateOnly(load.pickupDate)}</p>
              </div>
              <div className="surface-subtle rounded-2xl p-4">
                <p className="text-eyebrow text-[var(--muted-foreground)]">Delivery</p>
                <p className="font-operational text-fluid-base mt-2 font-semibold">{formatDateOnly(load.deliveryDate)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stops and timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {load.stops.map((stop) => (
                <div className="surface-subtle rounded-2xl border p-4" key={stop.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-eyebrow text-[var(--muted-foreground)]">{stop.type}</p>
                      <h3 className="text-fluid-base mt-1 font-semibold">{stop.facilityName}</h3>
                    </div>
                    <Badge variant="secondary">{stop.timezone}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-fluid-xs text-[var(--muted-foreground)]">Appointment</p>
                      <p className="font-operational text-fluid-sm">{formatDateTime(stop.appointmentStart)}</p>
                    </div>
                    <div>
                      <p className="text-fluid-xs text-[var(--muted-foreground)]">Check in</p>
                      <p className="font-operational text-fluid-sm">{formatDateTime(stop.checkInTime)}</p>
                    </div>
                    <div>
                      <p className="text-fluid-xs text-[var(--muted-foreground)]">Departure</p>
                      <p className="font-operational text-fluid-sm">{formatDateTime(stop.departureTime)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accessorial candidates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {load.candidates.map((candidate) => (
                <div className="surface-subtle rounded-2xl border p-4" key={candidate.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-fluid-base font-semibold">{candidate.type}</h3>
                      <p className="text-fluid-sm mt-1 text-[var(--muted-foreground)]">{candidate.explanation}</p>
                    </div>
                    <div className="space-y-2 text-right">
                      <StatusBadge value={candidate.eligibilityStatus} />
                      <div className="font-operational text-fluid-lg font-semibold">
                        {formatCurrency(Number(candidate.calculatedAmount))}
                      </div>
                    </div>
                  </div>
                  <p className="text-fluid-sm mt-3 text-[var(--muted-foreground)]">{candidate.evidenceSummary}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload support document</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={uploadDocumentForLoad} className="space-y-4">
                <input name="loadId" type="hidden" value={load.id} />
                <div>
                  <label className="text-fluid-sm mb-2 block font-medium">Document type</label>
                  <select
                    className="text-fluid-base min-h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3"
                    name="documentType"
                  >
                    <option value="BOL">BOL</option>
                    <option value="POD">POD</option>
                    <option value="LUMPER_RECEIPT">Lumper receipt</option>
                    <option value="RATE_CONFIRMATION">Rate confirmation</option>
                    <option value="EMAIL_SCREENSHOT">Email screenshot</option>
                    <option value="CHECKIN_SCREENSHOT">Check-in screenshot</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-fluid-sm mb-2 block font-medium">File</label>
                  <input
                    className="text-fluid-base block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3"
                    name="file"
                    required
                    type="file"
                  />
                </div>
                <SubmitButton type="submit" variant="outline">
                  Upload and extract
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          {load.documents.map((document) => {
            const extraction = extractionSchema.safeParse(document.reviewedExtractionJson ?? document.rawExtractionJson);

            return (
              <Card key={document.id}>
                <CardHeader>
                  <CardTitle>{document.fileName}</CardTitle>
                  <CardDescription>
                    {document.documentType ?? "OTHER"} • {document.fileType} • {Math.round(document.fileSize / 1024)} KB
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge value={document.extractionStatus} />
                    <Badge variant="secondary">
                      Confidence{" "}
                      <span className="font-operational">
                        {document.extractionConfidence ? Number(document.extractionConfidence).toFixed(2) : "0.00"}
                      </span>
                    </Badge>
                    <Link className="text-fluid-sm font-medium text-[var(--primary)]" href={document.storageUrl} target="_blank">
                      Open asset
                    </Link>
                  </div>
                  <DocumentReviewForm
                    documentId={document.id}
                    initialValues={{
                      documentType: extraction.success ? extraction.data.document_type : document.documentType ?? "OTHER",
                      referenced_load_number: extraction.success ? extraction.data.referenced_load_number : null,
                      customer_name: extraction.success ? extraction.data.customer_name : null,
                      facility_name: extraction.success ? extraction.data.facility_name : null,
                      appointment_time: extraction.success ? extraction.data.appointment_time : null,
                      arrival_time: extraction.success ? extraction.data.arrival_time : null,
                      check_in_time: extraction.success ? extraction.data.check_in_time : null,
                      dock_in_time: extraction.success ? extraction.data.dock_in_time : null,
                      loaded_out_time: extraction.success ? extraction.data.loaded_out_time : null,
                      departure_time: extraction.success ? extraction.data.departure_time : null,
                      lumper_amount: extraction.success ? extraction.data.lumper_amount ?? undefined : undefined,
                      currency: extraction.success ? extraction.data.currency : "USD",
                      cancellation_flag: extraction.success ? extraction.data.cancellation_flag ?? false : false,
                      layover_reason: extraction.success ? extraction.data.layover_reason : null,
                      notes: extraction.success ? extraction.data.notes : null,
                      confidence_score: extraction.success ? extraction.data.confidence_score : 0,
                    }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
