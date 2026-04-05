import { Prisma, type RuleSet } from "@prisma/client";

import { evaluateAccessorials, resolveRuleSet } from "@/lib/rules/engine";
import type { RuleSetSnapshot } from "@/lib/rules/types";

function makeRuleSetSnapshot(overrides: Partial<RuleSetSnapshot> = {}): RuleSetSnapshot {
  return {
    id: "rule_default",
    name: "Default",
    currency: "USD",
    detentionEnabled: true,
    detentionFreeMinutes: 120,
    detentionRatePerHour: 90,
    detentionBillingIncrementMinutes: 60,
    detentionRoundingMode: "UP",
    detentionCapAmount: null,
    layoverEnabled: true,
    layoverFlatAmount: 250,
    tonuEnabled: true,
    tonuFlatAmount: 175,
    lumperEnabled: true,
    lumperCapAmount: 300,
    ...overrides,
  };
}

function makeRuleSet(overrides: Partial<RuleSet> = {}): RuleSet {
  return {
    id: "rule_default",
    organizationId: "org_1",
    customerId: null,
    facilityId: null,
    name: "Default",
    priority: 1,
    isDefault: true,
    currency: "USD",
    active: true,
    detentionEnabled: true,
    detentionFreeMinutes: 120,
    detentionRatePerHour: new Prisma.Decimal(90),
    detentionBillingIncrementMinutes: 60,
    detentionRoundingMode: "UP",
    detentionCapAmount: null,
    layoverEnabled: true,
    layoverFlatAmount: new Prisma.Decimal(250),
    tonuEnabled: true,
    tonuFlatAmount: new Prisma.Decimal(175),
    lumperEnabled: true,
    lumperReimbursementMode: "ACTUAL",
    lumperCapAmount: new Prisma.Decimal(300),
    notes: null,
    effectiveStartDate: new Date("2026-01-01T00:00:00.000Z"),
    effectiveEndDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("rules engine", () => {
  it("calculates detention using free minutes, increments, and rounding", () => {
    const results = evaluateAccessorials({
      ruleSet: makeRuleSetSnapshot(),
      load: {
        id: "load_1",
        pickupDate: new Date("2026-03-05T08:00:00.000Z"),
        deliveryDate: new Date("2026-03-05T17:00:00.000Z"),
      },
      stops: [
        {
          id: "stop_1",
          type: "DELIVERY",
          timezone: "America/Chicago",
          facilityName: "Acme Dallas",
          appointmentStart: new Date("2026-03-05T13:00:00.000Z"),
          appointmentEnd: new Date("2026-03-05T14:00:00.000Z"),
          arrivalTime: new Date("2026-03-05T13:00:00.000Z"),
          checkInTime: new Date("2026-03-05T13:15:00.000Z"),
          dockInTime: new Date("2026-03-05T13:30:00.000Z"),
          loadedOutTime: new Date("2026-03-05T17:00:00.000Z"),
          departureTime: new Date("2026-03-05T17:15:00.000Z"),
        },
      ],
      evidence: {},
    });

    expect(results[0].eligibilityStatus).toBe("ELIGIBLE");
    expect(results[0].calculatedAmount).toBe(180);
    expect(results[0].calculationJson).toMatchObject({
      dwellMinutes: 240,
      netMinutes: 120,
      roundedMinutes: 120,
    });
  });

  it("marks layover as needs review when next-day delay exists but reason is missing", () => {
    const results = evaluateAccessorials({
      ruleSet: makeRuleSetSnapshot(),
      load: {
        id: "load_2",
        pickupDate: new Date("2026-03-05T08:00:00.000Z"),
        deliveryDate: new Date("2026-03-06T12:00:00.000Z"),
      },
      stops: [],
      evidence: {},
    });

    expect(results.find((candidate) => candidate.type === "LAYOVER")?.eligibilityStatus).toBe("NEEDS_REVIEW");
  });

  it("calculates TONU only when cancellation and truck-order evidence are both present", () => {
    const results = evaluateAccessorials({
      ruleSet: makeRuleSetSnapshot(),
      load: {
        id: "load_3",
        pickupDate: new Date("2026-03-05T08:00:00.000Z"),
        deliveryDate: new Date("2026-03-05T12:00:00.000Z"),
      },
      stops: [],
      evidence: {
        cancellationFlag: true,
        hasRateConfirmation: true,
      },
    });

    expect(results.find((candidate) => candidate.type === "TONU")?.calculatedAmount).toBe(175);
  });

  it("caps lumper reimbursement at the configured rule amount", () => {
    const results = evaluateAccessorials({
      ruleSet: makeRuleSetSnapshot({ lumperCapAmount: 150 }),
      load: {
        id: "load_4",
        pickupDate: new Date(),
        deliveryDate: new Date(),
      },
      stops: [],
      evidence: {
        hasLumperReceipt: true,
        lumperAmount: 184.5,
      },
    });

    expect(results.find((candidate) => candidate.type === "LUMPER")?.calculatedAmount).toBe(150);
  });

  it("uses facility-specific rules before customer-wide and default rules", () => {
    const resolved = resolveRuleSet(
      [
        makeRuleSet(),
        makeRuleSet({
          id: "rule_customer",
          customerId: "customer_1",
          isDefault: false,
          priority: 5,
        }),
        makeRuleSet({
          id: "rule_facility",
          customerId: "customer_1",
          facilityId: "facility_1",
          isDefault: false,
          priority: 10,
        }),
      ],
      {
        customerId: "customer_1",
        facilityId: "facility_1",
        asOf: new Date("2026-03-05T00:00:00.000Z"),
      },
    );

    expect(resolved?.id).toBe("rule_facility");
  });

  it("handles timezone-sensitive timestamp math using absolute timestamps", () => {
    const results = evaluateAccessorials({
      ruleSet: makeRuleSetSnapshot({
        detentionFreeMinutes: 60,
        detentionRatePerHour: 100,
        detentionBillingIncrementMinutes: 30,
      }),
      load: {
        id: "load_5",
        pickupDate: new Date("2026-03-05T08:00:00-06:00"),
        deliveryDate: new Date("2026-03-05T16:00:00-05:00"),
      },
      stops: [
        {
          id: "stop_5",
          type: "DELIVERY",
          timezone: "America/New_York",
          facilityName: "Northline Newark",
          appointmentStart: new Date("2026-03-05T07:00:00-05:00"),
          appointmentEnd: new Date("2026-03-05T08:00:00-05:00"),
          arrivalTime: new Date("2026-03-05T07:00:00-05:00"),
          checkInTime: new Date("2026-03-05T07:30:00-05:00"),
          dockInTime: new Date("2026-03-05T08:00:00-05:00"),
          loadedOutTime: new Date("2026-03-05T10:45:00-05:00"),
          departureTime: new Date("2026-03-05T11:00:00-05:00"),
        },
      ],
      evidence: {},
    });

    expect(results[0].calculatedAmount).toBe(250);
  });
});
