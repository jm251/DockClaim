"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Papa from "papaparse";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  addClaimInternalNoteAction,
  commitCsvImportAction,
  createCheckoutSessionAction,
  createCustomerAction,
  createFacilityAction,
  createRuleAction,
  inviteTeammateAction,
  reviewDocumentAction,
  sendClaimEmailAction,
  updateClaimStatusAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  claimStatusSchema,
  customerSchema,
  documentReviewSchema,
  facilitySchema,
  internalNoteSchema,
  inviteSchema,
  ruleSetSchema,
} from "@/lib/validators";

type CustomerValues = z.output<typeof customerSchema>;
type FacilityValues = z.output<typeof facilitySchema>;
type RuleValues = z.output<typeof ruleSetSchema>;
type InviteValues = z.output<typeof inviteSchema>;
type DocumentReviewValues = z.output<typeof documentReviewSchema>;
type ClaimStatusValues = z.output<typeof claimStatusSchema>;
type InternalNoteValues = z.output<typeof internalNoteSchema>;

const importFieldOptions = [
  "externalLoadNumber",
  "customerName",
  "carrierName",
  "facilityName",
  "pickupDate",
  "deliveryDate",
  "pickupAppointmentStart",
  "pickupAppointmentEnd",
  "deliveryAppointmentStart",
  "deliveryAppointmentEnd",
  "arrivalTime",
  "checkInTime",
  "dockInTime",
  "loadedOutTime",
  "departureTime",
  "lumperAmount",
  "notes",
] as const;

const importFieldAliases: Record<(typeof importFieldOptions)[number], string[]> = {
  externalLoadNumber: ["externalloadnumber", "loadnumber", "load", "loadid", "shipmentnumber", "pro"],
  customerName: ["customername", "customer", "shipper", "account"],
  carrierName: ["carriername", "carrier", "truckingcompany"],
  facilityName: ["facilityname", "facility", "warehouse", "deliveryfacility", "receiver"],
  pickupDate: ["pickupdate", "pickup", "shipdate", "originpickup"],
  deliveryDate: ["deliverydate", "delivery", "dropdate", "deliveryappointmentdate"],
  pickupAppointmentStart: ["pickupappointmentstart", "pickupapptstart", "pickupstart", "originappointmentstart"],
  pickupAppointmentEnd: ["pickupappointmentend", "pickupapptend", "pickupend", "originappointmentend"],
  deliveryAppointmentStart: [
    "deliveryappointmentstart",
    "deliveryapptstart",
    "deliverystart",
    "receiverappointmentstart",
  ],
  deliveryAppointmentEnd: ["deliveryappointmentend", "deliveryapptend", "deliveryend", "receiverappointmentend"],
  arrivalTime: ["arrivaltime", "arrival", "arrived", "arrivaldatetime"],
  checkInTime: ["checkintime", "checkin", "gatein", "signin"],
  dockInTime: ["dockintime", "dockin", "ondock"],
  loadedOutTime: ["loadedouttime", "loadedout", "dockouttime", "unloadedtime", "loadingcomplete"],
  departureTime: ["departuretime", "departure", "checkouttime", "gateout"],
  lumperAmount: ["lumperamount", "lumper", "lumperfee", "receiptamount"],
  notes: ["notes", "comments", "memo", "description"],
};

function normalizeImportHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildSuggestedMapping(headers: string[]) {
  const normalizedHeaders = headers.map((header) => ({
    header,
    normalized: normalizeImportHeader(header),
  }));

  const suggestedMapping: Record<string, string> = {};

  for (const field of importFieldOptions) {
    const aliases = [field, ...importFieldAliases[field]].map(normalizeImportHeader);
    const match = normalizedHeaders.find(({ normalized }) =>
      aliases.some((alias) => normalized === alias || normalized.includes(alias) || alias.includes(normalized)),
    );

    if (match) {
      suggestedMapping[field] = match.header;
    }
  }

  return suggestedMapping;
}

export function CustomerForm() {
  const router = useRouter();
  const form = useForm<z.input<typeof customerSchema>, unknown, CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      billingEmail: "",
      status: "ACTIVE",
      notes: "",
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add customer</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              await createCustomerAction(values);
              toast.success("Customer added.");
              form.reset();
              router.refresh();
            });
          })}
        >
          <div>
            <Label>Customer name</Label>
            <Input {...form.register("name")} />
          </div>
          <div>
            <Label>Billing email</Label>
            <Input type="email" {...form.register("billingEmail")} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} />
          </div>
          <Button className="w-full" type="submit">
            Save customer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function FacilityForm({
  customers,
}: {
  customers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const form = useForm<z.input<typeof facilitySchema>, unknown, FacilityValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      customerId: customers[0]?.id ?? "",
      name: "",
      address: "",
      city: "",
      state: "",
      timezone: "America/Chicago",
      notes: "",
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add facility</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              await createFacilityAction(values);
              toast.success("Facility added.");
              form.reset();
              router.refresh();
            });
          })}
        >
          <div>
            <Label>Customer</Label>
            <Select {...form.register("customerId")}>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Facility name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Input {...form.register("address")} />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input {...form.register("timezone")} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>City</Label>
              <Input {...form.register("city")} />
            </div>
            <div>
              <Label>State</Label>
              <Input {...form.register("state")} />
            </div>
          </div>
          <Button className="w-full" type="submit">
            Save facility
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function RuleForm({
  customers,
  facilities,
}: {
  customers: Array<{ id: string; name: string }>;
  facilities: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const form = useForm<z.input<typeof ruleSetSchema>, unknown, RuleValues>({
    resolver: zodResolver(ruleSetSchema),
    defaultValues: {
      name: "",
      customerId: "",
      facilityId: "",
      priority: 1,
      isDefault: false,
      currency: "USD",
      detentionEnabled: true,
      detentionFreeMinutes: 120,
      detentionRatePerHour: 85,
      detentionBillingIncrementMinutes: 60,
      detentionRoundingMode: "UP",
      layoverEnabled: true,
      layoverFlatAmount: 250,
      tonuEnabled: true,
      tonuFlatAmount: 175,
      lumperEnabled: true,
      notes: "",
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create rule set</CardTitle>
        <CardDescription>Set precedence with priority, then target a customer or facility when needed.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              await createRuleAction(values);
              toast.success("Rule set saved.");
              form.reset();
              router.refresh();
            });
          })}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input {...form.register("name")} />
            </div>
            <div>
              <Label>Priority</Label>
              <Input type="number" {...form.register("priority", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Customer scope</Label>
              <Select {...form.register("customerId")}>
                <option value="">All customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Facility scope</Label>
              <Select {...form.register("facilityId")}>
                <option value="">All facilities</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Free minutes</Label>
              <Input type="number" {...form.register("detentionFreeMinutes", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Rate / hour</Label>
              <Input type="number" step="0.01" {...form.register("detentionRatePerHour", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Increment</Label>
              <Select {...form.register("detentionBillingIncrementMinutes")}>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">60 min</option>
              </Select>
            </div>
            <div>
              <Label>Rounding</Label>
              <Select {...form.register("detentionRoundingMode")}>
                <option value="UP">Up</option>
                <option value="NEAREST">Nearest</option>
                <option value="DOWN">Down</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Layover flat</Label>
              <Input type="number" step="0.01" {...form.register("layoverFlatAmount", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>TONU flat</Label>
              <Input type="number" step="0.01" {...form.register("tonuFlatAmount", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Lumper cap</Label>
              <Input type="number" step="0.01" {...form.register("lumperCapAmount", { valueAsNumber: true })} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} />
          </div>
          <Button className="w-full" type="submit">
            Save rule set
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function InviteForm() {
  const router = useRouter();
  const form = useForm<z.input<typeof inviteSchema>, unknown, InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "OPS",
    },
  });
  const [inviteUrl, setInviteUrl] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite teammate</CardTitle>
        <CardDescription>Send a workspace invite or copy the secure invite link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await inviteTeammateAction(values);
              setInviteUrl(result.inviteUrl);
              toast.success(result.emailed ? "Invitation sent." : "Invite link created.");
              form.reset();
              router.refresh();
            });
          })}
        >
          <div>
            <Label>Email</Label>
            <Input type="email" {...form.register("email")} />
          </div>
          <div>
            <Label>Role</Label>
            <Select {...form.register("role")}>
              <option value="OWNER">Owner</option>
              <option value="OPS">Ops</option>
              <option value="BILLING">Billing</option>
              <option value="VIEWER">Viewer</option>
            </Select>
          </div>
          <Button className="w-full" type="submit">
            Create invite
          </Button>
        </form>
        {inviteUrl ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-dashed p-4">
            <p className="text-eyebrow text-[var(--muted-foreground)]">Fallback invite link</p>
            <Input readOnly value={inviteUrl} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ImportWizard({
  templates,
}: {
  templates: Array<{ id: string; name: string; mappingJson: Record<string, string> }>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Array<Record<string, string | null | undefined>>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [saveTemplate, setSaveTemplate] = useState(false);

  function loadCsv(file: File) {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(result.data);
        const parsedHeaders = result.meta.fields ?? [];
        setHeaders(parsedHeaders);
        setMapping(buildSuggestedMapping(parsedHeaders));
      },
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>1. Upload CSV</CardTitle>
          <CardDescription>Parse exported TMS loads locally in the browser before committing them to the database.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-csv-file">CSV file</Label>
            <Input
              aria-label="CSV file"
              accept=".csv,text/csv"
              id="import-csv-file"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  loadCsv(file);
                }
              }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                type="button"
                variant="outline"
                onClick={() => {
                  setMapping(template.mappingJson);
                  setTemplateName(template.name);
                }}
              >
                Use template: {template.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Map columns</CardTitle>
          <CardDescription>Choose how incoming CSV fields connect to DockClaim load and stop fields.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {importFieldOptions.map((field) => (
            <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]" key={field}>
              <div className="text-fluid-sm font-medium">{field}</div>
              <Select
                value={mapping[field] ?? ""}
                onChange={(event) =>
                  setMapping((previous) => ({
                    ...previous,
                    [field]: event.target.value,
                  }))
                }
              >
                <option value="">Ignore</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>3. Preview and import</CardTitle>
          <CardDescription>Review the first five rows, optionally save the mapping, then import loads and stops.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
            <Input placeholder="Template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            <label className="text-fluid-sm flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
              <input checked={saveTemplate} type="checkbox" onChange={(e) => setSaveTemplate(e.target.checked)} />
              Save template
            </label>
            <Button
              disabled={!rows.length}
              onClick={() =>
                startTransition(async () => {
                  await commitCsvImportAction({
                    fileName,
                    mapping,
                    rows,
                    saveTemplate,
                    templateName,
                  });
                  toast.success("Import committed.");
                  router.refresh();
                })
              }
              type="button"
            >
              Import {rows.length || 0} rows
            </Button>
          </div>
          <div className="overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface-elevated)]">
            <table className="text-fluid-sm w-full min-w-[760px]">
              <thead>
                <tr className="border-b">
                  {headers.map((header) => (
                    <th className="text-eyebrow px-3 py-2 text-left text-[var(--foreground-soft)]" key={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, index) => (
                  <tr className="border-b" key={index}>
                    {headers.map((header) => (
                      <td className="px-3 py-2" key={header}>
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DocumentReviewForm({
  documentId,
  initialValues,
}: {
  documentId: string;
  initialValues: z.infer<typeof documentReviewSchema>;
}) {
  const router = useRouter();
  const form = useForm<z.input<typeof documentReviewSchema>, unknown, DocumentReviewValues>({
    resolver: zodResolver(documentReviewSchema),
    defaultValues: initialValues,
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          await reviewDocumentAction(documentId, {
            ...values,
            lumper_amount:
              typeof values.lumper_amount === "number" && Number.isFinite(values.lumper_amount)
                ? values.lumper_amount
                : undefined,
          });
          toast.success("Document review saved and candidates recalculated.");
          router.refresh();
        });
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Document type</Label>
          <Select {...form.register("documentType")}>
            <option value="BOL">BOL</option>
            <option value="POD">POD</option>
            <option value="LUMPER_RECEIPT">Lumper receipt</option>
            <option value="RATE_CONFIRMATION">Rate confirmation</option>
            <option value="EMAIL_SCREENSHOT">Email screenshot</option>
            <option value="CHECKIN_SCREENSHOT">Check-in screenshot</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div>
          <Label>Confidence</Label>
          <Input type="number" step="0.01" {...form.register("confidence_score", { valueAsNumber: true })} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label>Arrival</Label>
          <Input {...form.register("arrival_time")} />
        </div>
        <div>
          <Label>Check in</Label>
          <Input {...form.register("check_in_time")} />
        </div>
        <div>
          <Label>Departure</Label>
          <Input {...form.register("departure_time")} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Lumper amount</Label>
          <Input type="number" step="0.01" {...form.register("lumper_amount", { valueAsNumber: true })} />
        </div>
        <div>
          <Label>Layover reason</Label>
          <Input {...form.register("layover_reason")} />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea {...form.register("notes")} />
      </div>
      <Button type="submit">Save review</Button>
    </form>
  );
}

export function ClaimStatusForm({
  claimId,
  defaultStatus,
}: {
  claimId: string;
  defaultStatus: z.infer<typeof claimStatusSchema>["status"];
}) {
  const router = useRouter();
  const form = useForm<z.input<typeof claimStatusSchema>, unknown, ClaimStatusValues>({
    resolver: zodResolver(claimStatusSchema),
    defaultValues: {
      status: defaultStatus,
      disputeReason: "",
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          await updateClaimStatusAction(claimId, values);
          toast.success("Claim status updated.");
          router.refresh();
        });
      })}
    >
      <div>
        <Label>Status</Label>
        <Select {...form.register("status")}>
          <option value="DRAFT">Draft</option>
          <option value="READY_TO_SEND">Ready to send</option>
          <option value="SENT">Sent</option>
          <option value="PARTIAL_PAID">Partial paid</option>
          <option value="PAID">Paid</option>
          <option value="DISPUTED">Disputed</option>
          <option value="WRITTEN_OFF">Written off</option>
        </Select>
      </div>
      <div>
        <Label>Dispute reason / payment note</Label>
        <Textarea {...form.register("disputeReason")} />
      </div>
      <Button type="submit">Update status</Button>
    </form>
  );
}

export function InternalNoteForm({ claimId }: { claimId: string }) {
  const router = useRouter();
  const form = useForm<z.input<typeof internalNoteSchema>, unknown, InternalNoteValues>({
    resolver: zodResolver(internalNoteSchema),
    defaultValues: {
      subject: "",
      body: "",
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          await addClaimInternalNoteAction(claimId, values);
          toast.success("Internal note added.");
          form.reset();
          router.refresh();
        });
      })}
    >
      <div>
        <Label>Subject</Label>
        <Input {...form.register("subject")} />
      </div>
      <div>
        <Label>Note</Label>
        <Textarea {...form.register("body")} />
      </div>
      <Button type="submit" variant="outline">
        Add internal note
      </Button>
    </form>
  );
}

export function BillingCheckoutButton() {
  return (
    <Button
      onClick={() =>
        startTransition(async () => {
          const result = await createCheckoutSessionAction();
          if (!result.configured || !result.url) {
            toast.error(result.reason ?? "Stripe billing is not configured.");
            return;
          }
          window.location.href = result.url;
        })
      }
    >
      Start monthly subscription
    </Button>
  );
}

export function SendClaimEmailButton({ claimId }: { claimId: string }) {
  return (
    <Button
      onClick={() =>
        startTransition(async () => {
          const result = await sendClaimEmailAction(claimId);
          if (!result.sent) {
            await navigator.clipboard.writeText(`${result.subject}\n\n${result.body}`);
            toast.info(result.reason ?? "Email was not sent. Subject/body copied to clipboard instead.");
            return;
          }
          toast.success("Claim email sent.");
        })
      }
      variant="secondary"
    >
      Send claim email
    </Button>
  );
}
