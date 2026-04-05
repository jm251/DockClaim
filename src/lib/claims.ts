import type { Claim, ClaimLineItem, Customer, Load, Organization } from "@prisma/client";

import { aiProvider } from "@/lib/providers/ai";
import { formatCurrency } from "@/lib/utils";

type ClaimDetail = Claim & {
  customer: Customer;
  load: Load;
  lineItems: ClaimLineItem[];
  organization: Organization;
};

export async function buildClaimEmailDraft(claim: ClaimDetail) {
  const lineItems = claim.lineItems
    .map((item) => `- ${item.accessorialType}: ${formatCurrency(Number(item.amount))} | ${item.description}`)
    .join("\n");

  const subject = `${claim.organization.name} accessorial claim ${claim.claimNumber} for load ${claim.load.externalLoadNumber}`;
  const body = [
    `Hello ${claim.customer.name} billing team,`,
    "",
    `Please review DockClaim claim ${claim.claimNumber} for load ${claim.load.externalLoadNumber}.`,
    `The amount requested is ${formatCurrency(Number(claim.totalAmount))}.`,
    "",
    "Line items:",
    lineItems,
    "",
    "Supporting documentation and a claim summary PDF are attached or available from the portal.",
    "",
    "Please confirm receipt and advise on expected remittance timing.",
    "",
    `Thank you,`,
    `${claim.organization.name} Revenue Recovery`,
  ].join("\n");

  if (aiProvider.polishClaimDraft) {
    return aiProvider.polishClaimDraft({ subject, body });
  }

  return { subject, body };
}

export function buildClaimTimeline(events: Array<{ label: string; timestamp?: Date | null; detail?: string }>) {
  return events.filter((event) => event.timestamp || event.detail);
}
