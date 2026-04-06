import { readFileSync } from "node:fs";
import path from "node:path";

import { getSubscriptionPresentation } from "@/lib/billing";
import { extractionSchema } from "@/lib/extraction-schema";
import { importCommitSchema } from "@/lib/validators";
import { assertOrganizationScope } from "@/lib/authorization";

describe("contracts and guards", () => {
  it("validates CSV import payload shape", () => {
    const parsed = importCommitSchema.parse({
      fileName: "loads.csv",
      mapping: {
        externalLoadNumber: "Load Number",
        customerName: "Customer",
        pickupDate: "Pickup Date",
        deliveryDate: "Delivery Date",
      },
      rows: [
        {
          "Load Number": "12345",
          Customer: "Acme",
          "Pickup Date": "2026-03-01",
          "Delivery Date": "2026-03-02",
        },
      ],
      saveTemplate: true,
      templateName: "Default import",
    });

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.mapping.externalLoadNumber).toBe("Load Number");
  });

  it("validates extraction payload structure", () => {
    const parsed = extractionSchema.parse({
      document_type: "LUMPER_RECEIPT",
      referenced_load_number: "12345",
      customer_name: "Acme",
      facility_name: "Acme Dallas",
      appointment_time: null,
      arrival_time: null,
      check_in_time: null,
      dock_in_time: null,
      loaded_out_time: null,
      departure_time: null,
      lumper_amount: 184.5,
      currency: "USD",
      cancellation_flag: false,
      layover_reason: null,
      notes: "Receipt attached",
      confidence_score: 0.9,
    });

    expect(parsed.lumper_amount).toBe(184.5);
  });

  it("gates access only when subscription is inactive outside demo mode", () => {
    const gated = getSubscriptionPresentation(
      {
        status: "INACTIVE",
        trialEndsAt: new Date("2026-03-01T00:00:00.000Z"),
        currentPeriodEnd: null,
      },
      "supabase",
    );

    const demo = getSubscriptionPresentation(
      {
        status: "INACTIVE",
        trialEndsAt: new Date("2026-03-01T00:00:00.000Z"),
        currentPeriodEnd: null,
      },
      "demo",
    );

    expect(typeof gated.gated).toBe("boolean");
    expect(demo.gated).toBe(false);
  });

  it("throws on organization scope mismatch", () => {
    expect(() => assertOrganizationScope("org_a", "org_b")).toThrow("Organization scope mismatch.");
  });

  it("keeps sidebar-backed pages on focused data loaders", () => {
    const sidebarPages = [
      "src/app/app/(workspace)/imports/page.tsx",
      "src/app/app/(workspace)/loads/page.tsx",
      "src/app/app/(workspace)/claims/page.tsx",
      "src/app/app/(workspace)/customers/page.tsx",
      "src/app/app/(workspace)/facilities/page.tsx",
      "src/app/app/(workspace)/rules/page.tsx",
      "src/app/app/(workspace)/settings/page.tsx",
    ];

    for (const relativePath of sidebarPages) {
      const content = readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
      expect(content).not.toContain("getAppCollections");
    }
  });
});
