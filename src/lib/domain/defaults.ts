import type { MembershipRole, Prisma } from "@prisma/client";

export const membershipRoleOptions: Array<{ label: string; value: MembershipRole }> = [
  { label: "Owner", value: "OWNER" },
  { label: "Ops", value: "OPS" },
  { label: "Billing", value: "BILLING" },
  { label: "Viewer", value: "VIEWER" },
];

export function buildDefaultRuleSet(organizationId: string): Prisma.RuleSetUncheckedCreateInput {
  return {
    organizationId,
    name: "Organization Default",
    priority: 1,
    isDefault: true,
    currency: "USD",
    active: true,
    detentionEnabled: true,
    detentionFreeMinutes: 120,
    detentionRatePerHour: 85,
    detentionBillingIncrementMinutes: 60,
    detentionRoundingMode: "UP",
    detentionCapAmount: 600,
    layoverEnabled: true,
    layoverFlatAmount: 250,
    tonuEnabled: true,
    tonuFlatAmount: 175,
    lumperEnabled: true,
    lumperReimbursementMode: "ACTUAL",
    lumperCapAmount: 350,
    notes: "Default organization-wide fallback accessorial policy.",
    effectiveStartDate: new Date("2020-01-01T00:00:00.000Z"),
  };
}

export const documentTypeOptions = [
  { label: "BOL", value: "BOL" },
  { label: "POD", value: "POD" },
  { label: "Lumper Receipt", value: "LUMPER_RECEIPT" },
  { label: "Rate Confirmation", value: "RATE_CONFIRMATION" },
  { label: "Email Screenshot", value: "EMAIL_SCREENSHOT" },
  { label: "Check-in / Check-out", value: "CHECKIN_SCREENSHOT" },
  { label: "Other", value: "OTHER" },
] as const;
