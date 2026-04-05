import type { AccessorialCandidate, Document, Prisma } from "@prisma/client";
import { parseISO } from "date-fns";

import { buildClaimEmailDraft } from "@/lib/claims";
import { extractionSchema } from "@/lib/providers/ai";
import { prisma } from "@/lib/prisma";
import { evaluateAccessorials, resolveRuleSet, ruleSetToSnapshot } from "@/lib/rules/engine";
import type { EvidenceSnapshot } from "@/lib/rules/types";

function parseExtractionJson(value: Prisma.JsonValue | null | undefined) {
  const result = extractionSchema.safeParse(value);
  return result.success ? result.data : null;
}

function maybeDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function extractEvidenceFromNotes(notes?: string | null) {
  if (!notes) {
    return {
      layoverReason: null,
      cancellationFlag: false,
      lumperAmount: null,
      lumperOverrideNote: null,
    };
  }

  const layoverReason = notes.match(/LAYOVER_REASON=(.+)/i)?.[1]?.trim() ?? null;
  const cancellationFlag = /CANCELLATION=(true|1|yes)/i.test(notes);
  const lumperAmountMatch = notes.match(/LUMPER_AMOUNT=([0-9.]+)/i)?.[1];
  const lumperOverrideNote = notes.match(/LUMPER_NOTE=(.+)/i)?.[1]?.trim() ?? null;

  return {
    layoverReason,
    cancellationFlag,
    lumperAmount: lumperAmountMatch ? Number(lumperAmountMatch) : null,
    lumperOverrideNote,
  };
}

export function aggregateEvidence(input: {
  loadNotes?: string | null;
  documents: Array<
    Pick<Document, "documentType" | "rawExtractionJson" | "reviewedExtractionJson"> & { fileName: string }
  >;
}): EvidenceSnapshot {
  const noteEvidence = extractEvidenceFromNotes(input.loadNotes);

  const parsedExtractions = input.documents
    .map((document) => parseExtractionJson(document.reviewedExtractionJson ?? document.rawExtractionJson))
    .filter(Boolean);

  const firstWithAmount = parsedExtractions.find((item) => item?.lumper_amount);
  const layoverReason =
    parsedExtractions.find((item) => item?.layover_reason)?.layover_reason ?? noteEvidence.layoverReason;

  return {
    layoverReason,
    layoverDate: parsedExtractions.find((item) => item?.appointment_time)?.appointment_time
      ? maybeDate(parsedExtractions.find((item) => item?.appointment_time)?.appointment_time ?? null)
      : null,
    cancellationFlag:
      parsedExtractions.some((item) => item?.cancellation_flag === true) || noteEvidence.cancellationFlag,
    hasRateConfirmation: input.documents.some((document) => document.documentType === "RATE_CONFIRMATION"),
    hasLumperReceipt: input.documents.some((document) => document.documentType === "LUMPER_RECEIPT"),
    lumperAmount: firstWithAmount?.lumper_amount ?? noteEvidence.lumperAmount,
    lumperOverrideAmount: noteEvidence.lumperAmount,
    lumperOverrideNote: noteEvidence.lumperOverrideNote,
    notes: parsedExtractions.map((item) => item?.notes).filter(Boolean) as string[],
  };
}

export async function recalculateLoadCandidates(organizationId: string, loadId: string) {
  const load = await prisma.load.findFirstOrThrow({
    where: {
      id: loadId,
      organizationId,
    },
    include: {
      stops: true,
      documents: true,
      customer: true,
      facility: true,
    },
  });

  const ruleSets = await prisma.ruleSet.findMany({
    where: {
      organizationId,
      active: true,
    },
  });

  const resolved = resolveRuleSet(ruleSets, {
    customerId: load.customerId,
    facilityId: load.facilityId,
    asOf: load.deliveryDate,
  });

  if (!resolved) {
    throw new Error("No applicable rule set was found for this load.");
  }

  const evidence = aggregateEvidence({
    loadNotes: load.notes,
    documents: load.documents,
  });

  const results = evaluateAccessorials({
    ruleSet: ruleSetToSnapshot(resolved),
    load: {
      id: load.id,
      pickupDate: load.pickupDate,
      deliveryDate: load.deliveryDate,
      notes: load.notes,
    },
    stops: load.stops.map((stop) => ({
      id: stop.id,
      type: stop.type,
      timezone: stop.timezone,
      facilityName: stop.facilityName,
      appointmentStart: stop.appointmentStart,
      appointmentEnd: stop.appointmentEnd,
      arrivalTime: stop.arrivalTime,
      checkInTime: stop.checkInTime,
      dockInTime: stop.dockInTime,
      loadedOutTime: stop.loadedOutTime,
      departureTime: stop.departureTime,
    })),
    evidence,
  });

  await prisma.$transaction(async (tx) => {
    await tx.accessorialCandidate.deleteMany({
      where: {
        organizationId,
        loadId,
      },
    });

    for (const result of results) {
      await tx.accessorialCandidate.create({
        data: {
          organizationId,
          loadId,
          stopId: result.stopId,
          type: result.type,
          eligibilityStatus: result.eligibilityStatus,
          calculatedAmount: result.calculatedAmount,
          currency: result.currency,
          explanation: result.explanation,
          evidenceSummary: result.evidenceSummary,
          calculationJson: result.calculationJson as Prisma.InputJsonValue,
          ruleSetId: result.ruleSetId,
        },
      });
    }

    await tx.load.update({
      where: { id: loadId },
      data: {
        status: results.some((result) => result.eligibilityStatus === "NEEDS_REVIEW")
          ? "IN_REVIEW"
          : "READY",
      },
    });
  });

  return results;
}

async function getNextClaimNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const count = await prisma.claim.count({
    where: {
      organizationId,
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
      },
    },
  });

  return `DC-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function createOrRefreshClaimForLoad(input: {
  organizationId: string;
  loadId: string;
  createdByUserId: string;
}) {
  const load = await prisma.load.findFirstOrThrow({
    where: {
      id: input.loadId,
      organizationId: input.organizationId,
    },
    include: {
      customer: true,
      candidates: true,
      claim: {
        include: {
          lineItems: true,
          customer: true,
          load: true,
          organization: true,
        },
      },
      organization: true,
    },
  });

  const eligibleCandidates = load.candidates.filter((candidate) => candidate.eligibilityStatus === "ELIGIBLE");

  if (eligibleCandidates.length === 0) {
    throw new Error("This load has no eligible accessorial candidates to claim.");
  }

  const totalAmount = eligibleCandidates.reduce((total, candidate) => total + Number(candidate.calculatedAmount), 0);
  const claimNumber = load.claim?.claimNumber ?? (await getNextClaimNumber(input.organizationId));

  const claim = await prisma.$transaction(async (tx) => {
    const nextClaim =
      load.claim ??
      (await tx.claim.create({
        data: {
          organizationId: input.organizationId,
          loadId: load.id,
          customerId: load.customerId,
          claimNumber,
          createdByUserId: input.createdByUserId,
          totalAmount,
        },
      }));

    await tx.claimLineItem.deleteMany({
      where: {
        claimId: nextClaim.id,
      },
    });

    for (const candidate of eligibleCandidates) {
      await tx.claimLineItem.create({
        data: {
          claimId: nextClaim.id,
          candidateId: candidate.id,
          accessorialType: candidate.type,
          amount: candidate.calculatedAmount,
          description: candidate.explanation,
        },
      });
    }

    return tx.claim.update({
      where: { id: nextClaim.id },
      data: {
        totalAmount,
        status: "DRAFT",
      },
      include: {
        customer: true,
        load: true,
        lineItems: true,
        organization: true,
      },
    });
  });

  const draft = await buildClaimEmailDraft(claim);

  await prisma.claimMessage.upsert({
    where: {
      id: `${claim.id}-draft`,
    },
    update: {
      subject: draft.subject,
      body: draft.body,
    },
    create: {
      id: `${claim.id}-draft`,
      claimId: claim.id,
      direction: "OUTBOUND",
      subject: draft.subject,
      body: draft.body,
    },
  });

  return claim;
}

export function getClaimAgingBucket(sentAt?: Date | null, createdAt?: Date | null) {
  const baseline = sentAt ?? createdAt;
  if (!baseline) {
    return "Unknown";
  }

  const ageDays = Math.floor((Date.now() - baseline.getTime()) / (1000 * 60 * 60 * 24));
  if (ageDays <= 7) {
    return "0-7 days";
  }
  if (ageDays <= 14) {
    return "8-14 days";
  }
  if (ageDays <= 30) {
    return "15-30 days";
  }
  return "31+ days";
}

export function sumEligibleCandidates(candidates: AccessorialCandidate[]) {
  return candidates
    .filter((candidate) => candidate.eligibilityStatus === "ELIGIBLE")
    .reduce((total, candidate) => total + Number(candidate.calculatedAmount), 0);
}
