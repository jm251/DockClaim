import type { AccessorialType, EligibilityStatus, RuleSet } from "@prisma/client";
import { differenceInMinutes, isAfter, isSameDay } from "date-fns";

import type {
  CandidateResult,
  EvidenceSnapshot,
  LoadSnapshot,
  RuleSetSnapshot,
  StopSnapshot,
} from "@/lib/rules/types";

function roundBillableMinutes(
  minutes: number,
  increment: number,
  mode: RuleSetSnapshot["detentionRoundingMode"],
) {
  if (minutes <= 0) {
    return 0;
  }

  const steps = minutes / increment;

  if (mode === "DOWN") {
    return Math.floor(steps) * increment;
  }

  if (mode === "NEAREST") {
    return Math.round(steps) * increment;
  }

  return Math.ceil(steps) * increment;
}

function toCurrencyAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function eligible(
  type: AccessorialType,
  amount: number,
  currency: string,
  explanation: string,
  evidenceSummary: string,
  ruleSetId: string,
  calculationJson: Record<string, unknown>,
  stopId?: string,
): CandidateResult {
  return {
    type,
    eligibilityStatus: "ELIGIBLE",
    calculatedAmount: toCurrencyAmount(amount),
    currency,
    explanation,
    evidenceSummary,
    ruleSetId,
    calculationJson,
    stopId,
  };
}

function ineligible(
  type: AccessorialType,
  status: EligibilityStatus,
  currency: string,
  explanation: string,
  evidenceSummary: string,
  ruleSetId: string,
  calculationJson: Record<string, unknown>,
  stopId?: string,
): CandidateResult {
  return {
    type,
    eligibilityStatus: status,
    calculatedAmount: 0,
    currency,
    explanation,
    evidenceSummary,
    ruleSetId,
    calculationJson,
    stopId,
  };
}

export function resolveRuleSet(
  ruleSets: RuleSet[],
  context: { customerId: string; facilityId?: string | null; asOf: Date },
) {
  const activeRules = ruleSets.filter((rule) => {
    const startsOkay = rule.effectiveStartDate <= context.asOf;
    const endsOkay = !rule.effectiveEndDate || rule.effectiveEndDate >= context.asOf;
    return rule.active && startsOkay && endsOkay;
  });

  const facilityCustomerMatch = activeRules
    .filter((rule) => rule.customerId === context.customerId && rule.facilityId === context.facilityId)
    .sort((a, b) => b.priority - a.priority)[0];

  if (facilityCustomerMatch) {
    return facilityCustomerMatch;
  }

  const customerMatch = activeRules
    .filter((rule) => rule.customerId === context.customerId && !rule.facilityId)
    .sort((a, b) => b.priority - a.priority)[0];

  if (customerMatch) {
    return customerMatch;
  }

  return activeRules
    .filter((rule) => rule.isDefault)
    .sort((a, b) => b.priority - a.priority)[0];
}

export function ruleSetToSnapshot(ruleSet: RuleSet): RuleSetSnapshot {
  return {
    id: ruleSet.id,
    name: ruleSet.name,
    currency: ruleSet.currency,
    detentionEnabled: ruleSet.detentionEnabled,
    detentionFreeMinutes: ruleSet.detentionFreeMinutes,
    detentionRatePerHour: Number(ruleSet.detentionRatePerHour),
    detentionBillingIncrementMinutes: ruleSet.detentionBillingIncrementMinutes,
    detentionRoundingMode: ruleSet.detentionRoundingMode,
    detentionCapAmount: ruleSet.detentionCapAmount ? Number(ruleSet.detentionCapAmount) : null,
    layoverEnabled: ruleSet.layoverEnabled,
    layoverFlatAmount: Number(ruleSet.layoverFlatAmount),
    tonuEnabled: ruleSet.tonuEnabled,
    tonuFlatAmount: Number(ruleSet.tonuFlatAmount),
    lumperEnabled: ruleSet.lumperEnabled,
    lumperCapAmount: ruleSet.lumperCapAmount ? Number(ruleSet.lumperCapAmount) : null,
  };
}

function calculateDetentionForStop(ruleSet: RuleSetSnapshot, stop: StopSnapshot): CandidateResult {
  const start = stop.checkInTime ?? stop.arrivalTime ?? stop.appointmentStart;
  const end = stop.departureTime ?? stop.loadedOutTime;

  if (!ruleSet.detentionEnabled) {
    return ineligible(
      "DETENTION",
      "NOT_ELIGIBLE",
      ruleSet.currency,
      "Detention is disabled for the applied rule set.",
      "Rule set disabled detention charges.",
      ruleSet.id,
      { reason: "disabled" },
      stop.id,
    );
  }

  if (!start && !end) {
    return ineligible(
      "DETENTION",
      "MISSING_EVIDENCE",
      ruleSet.currency,
      "No check-in/arrival or departure evidence is available.",
      "Missing both start and end timestamps.",
      ruleSet.id,
      { missing: ["start", "end"] },
      stop.id,
    );
  }

  if (!start || !end) {
    return ineligible(
      "DETENTION",
      "NEEDS_REVIEW",
      ruleSet.currency,
      "Partial facility timing exists, but not enough to calculate dwell deterministically.",
      "A start or end timestamp is missing.",
      ruleSet.id,
      { start, end },
      stop.id,
    );
  }

  if (!isAfter(end, start)) {
    return ineligible(
      "DETENTION",
      "NEEDS_REVIEW",
      ruleSet.currency,
      "Facility timestamps are out of order and require review.",
      "End time is not later than start time.",
      ruleSet.id,
      { start, end },
      stop.id,
    );
  }

  const dwellMinutes = differenceInMinutes(end, start);
  const netMinutes = Math.max(0, dwellMinutes - ruleSet.detentionFreeMinutes);

  if (netMinutes <= 0) {
    return ineligible(
      "DETENTION",
      "NOT_ELIGIBLE",
      ruleSet.currency,
      `Dwell was ${dwellMinutes} minutes, which is within the ${ruleSet.detentionFreeMinutes}-minute free window.`,
      "Facility dwell did not exceed free time.",
      ruleSet.id,
      { dwellMinutes, freeMinutes: ruleSet.detentionFreeMinutes },
      stop.id,
    );
  }

  const roundedMinutes = roundBillableMinutes(
    netMinutes,
    ruleSet.detentionBillingIncrementMinutes,
    ruleSet.detentionRoundingMode,
  );
  const baseAmount = (roundedMinutes / 60) * ruleSet.detentionRatePerHour;
  const cappedAmount =
    ruleSet.detentionCapAmount && baseAmount > ruleSet.detentionCapAmount
      ? ruleSet.detentionCapAmount
      : baseAmount;

  return eligible(
    "DETENTION",
    cappedAmount,
    ruleSet.currency,
    `Detention billed from ${roundedMinutes} rounded minutes after ${ruleSet.detentionFreeMinutes} free minutes.`,
    `Start ${start.toISOString()} to end ${end.toISOString()} produced ${dwellMinutes} dwell minutes.`,
    ruleSet.id,
    {
      dwellMinutes,
      freeMinutes: ruleSet.detentionFreeMinutes,
      netMinutes,
      roundedMinutes,
      ratePerHour: ruleSet.detentionRatePerHour,
      capAmount: ruleSet.detentionCapAmount,
      baseAmount,
      finalAmount: cappedAmount,
    },
    stop.id,
  );
}

function calculateLayover(
  ruleSet: RuleSetSnapshot,
  load: LoadSnapshot,
  evidence: EvidenceSnapshot,
): CandidateResult {
  if (!ruleSet.layoverEnabled) {
    return ineligible(
      "LAYOVER",
      "NOT_ELIGIBLE",
      ruleSet.currency,
      "Layover is disabled for the applied rule set.",
      "Rule set disabled layover charges.",
      ruleSet.id,
      { reason: "disabled" },
    );
  }

  const nextDayDelay =
    !isSameDay(load.pickupDate, load.deliveryDate) ||
    (!!evidence.layoverDate && !isSameDay(load.pickupDate, evidence.layoverDate));

  if (nextDayDelay && evidence.layoverReason) {
    return eligible(
      "LAYOVER",
      ruleSet.layoverFlatAmount,
      ruleSet.currency,
      "Layover evidence shows a next-day delay caused by the customer or facility.",
      evidence.layoverReason,
      ruleSet.id,
      {
        layoverReason: evidence.layoverReason,
        layoverDate: evidence.layoverDate?.toISOString() ?? null,
      },
    );
  }

  if (nextDayDelay) {
    return ineligible(
      "LAYOVER",
      "NEEDS_REVIEW",
      ruleSet.currency,
      "The load appears delayed into the next day, but the supporting reason is missing.",
      "Delay evidence exists without a customer/facility reason.",
      ruleSet.id,
      {
        layoverDate: evidence.layoverDate?.toISOString() ?? null,
      },
    );
  }

  return ineligible(
    "LAYOVER",
    "NOT_ELIGIBLE",
    ruleSet.currency,
    "No next-day delay evidence was found for layover billing.",
    "Pickup and delivery remained on the same day with no layover reason.",
    ruleSet.id,
    {},
  );
}

function calculateTonu(ruleSet: RuleSetSnapshot, evidence: EvidenceSnapshot): CandidateResult {
  if (!ruleSet.tonuEnabled) {
    return ineligible(
      "TONU",
      "NOT_ELIGIBLE",
      ruleSet.currency,
      "TONU is disabled for the applied rule set.",
      "Rule set disabled TONU charges.",
      ruleSet.id,
      { reason: "disabled" },
    );
  }

  if (evidence.cancellationFlag && evidence.hasRateConfirmation) {
    return eligible(
      "TONU",
      ruleSet.tonuFlatAmount,
      ruleSet.currency,
      "Truck ordered not used is supported by a cancellation flag and a rate confirmation.",
      "Cancellation evidence and rate confirmation are present.",
      ruleSet.id,
      {
        cancellationFlag: evidence.cancellationFlag,
        hasRateConfirmation: evidence.hasRateConfirmation,
      },
    );
  }

  if (evidence.cancellationFlag) {
    return ineligible(
      "TONU",
      "NEEDS_REVIEW",
      ruleSet.currency,
      "Cancellation evidence exists, but the ordered-truck evidence is incomplete.",
      "Missing a rate confirmation or equivalent order evidence.",
      ruleSet.id,
      {
        cancellationFlag: evidence.cancellationFlag,
        hasRateConfirmation: evidence.hasRateConfirmation,
      },
    );
  }

  return ineligible(
    "TONU",
    "NOT_ELIGIBLE",
    ruleSet.currency,
    "No cancellation evidence was found for TONU billing.",
    "The load does not show a cancellation/unavailable event.",
    ruleSet.id,
    {},
  );
}

function calculateLumper(ruleSet: RuleSetSnapshot, evidence: EvidenceSnapshot): CandidateResult {
  if (!ruleSet.lumperEnabled) {
    return ineligible(
      "LUMPER",
      "NOT_ELIGIBLE",
      ruleSet.currency,
      "Lumper reimbursement is disabled for the applied rule set.",
      "Rule set disabled lumper reimbursement.",
      ruleSet.id,
      { reason: "disabled" },
    );
  }

  const amount = evidence.lumperOverrideAmount ?? evidence.lumperAmount;
  if (!amount || amount <= 0) {
    return ineligible(
      "LUMPER",
      "MISSING_EVIDENCE",
      ruleSet.currency,
      "No lumper amount was found in the supporting documents or manual review.",
      "Missing lumper receipt amount.",
      ruleSet.id,
      {},
    );
  }

  const cappedAmount =
    ruleSet.lumperCapAmount && amount > ruleSet.lumperCapAmount ? ruleSet.lumperCapAmount : amount;

  if (evidence.hasLumperReceipt || evidence.lumperOverrideNote) {
    return eligible(
      "LUMPER",
      cappedAmount,
      ruleSet.currency,
      "Lumper reimbursement uses the captured receipt amount or manual override with note.",
      evidence.hasLumperReceipt ? "Receipt-backed reimbursement." : evidence.lumperOverrideNote ?? "",
      ruleSet.id,
      {
        sourceAmount: amount,
        capAmount: ruleSet.lumperCapAmount,
        finalAmount: cappedAmount,
        hasReceipt: evidence.hasLumperReceipt,
        overrideNote: evidence.lumperOverrideNote,
      },
    );
  }

  return ineligible(
    "LUMPER",
    "NEEDS_REVIEW",
    ruleSet.currency,
    "A lumper amount exists, but receipt or override note evidence is missing.",
    "Manual amount exists without receipt support.",
    ruleSet.id,
    {
      sourceAmount: amount,
    },
  );
}

export function evaluateAccessorials(input: {
  ruleSet: RuleSetSnapshot;
  load: LoadSnapshot;
  stops: StopSnapshot[];
  evidence: EvidenceSnapshot;
}) {
  const detentionCandidates = input.stops.map((stop) => calculateDetentionForStop(input.ruleSet, stop));
  const layoverCandidate = calculateLayover(input.ruleSet, input.load, input.evidence);
  const tonuCandidate = calculateTonu(input.ruleSet, input.evidence);
  const lumperCandidate = calculateLumper(input.ruleSet, input.evidence);

  return [...detentionCandidates, layoverCandidate, tonuCandidate, lumperCandidate];
}
