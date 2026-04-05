"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { Prisma } from "@prisma/client";

import { createAuditLog } from "@/lib/audit";
import { requireAppContext, requireRole, startDemoSession, clearDemoSession } from "@/lib/auth/session";
import { getStripeClient } from "@/lib/billing";
import { getClaimDetail } from "@/lib/data";
import { env, featureFlags } from "@/lib/env";
import { commitCsvImport } from "@/lib/imports";
import { createOrRefreshClaimForLoad, recalculateLoadCandidates } from "@/lib/loads";
import { mailProvider } from "@/lib/providers/mail";
import { aiProvider, extractionSchema } from "@/lib/providers/ai";
import { storageProvider } from "@/lib/providers/storage";
import { prisma } from "@/lib/prisma";
import {
  claimStatusSchema,
  customerSchema,
  documentReviewSchema,
  facilitySchema,
  importCommitSchema,
  internalNoteSchema,
  inviteSchema,
  ruleSetSchema,
} from "@/lib/validators";

function serializeExtractionReview(
  values: ReturnType<typeof documentReviewSchema.parse>,
): Record<string, unknown> {
  return {
    document_type: values.documentType,
    referenced_load_number: values.referenced_load_number ?? null,
    customer_name: values.customer_name ?? null,
    facility_name: values.facility_name ?? null,
    appointment_time: values.appointment_time ?? null,
    arrival_time: values.arrival_time ?? null,
    check_in_time: values.check_in_time ?? null,
    dock_in_time: values.dock_in_time ?? null,
    loaded_out_time: values.loaded_out_time ?? null,
    departure_time: values.departure_time ?? null,
    lumper_amount: Number.isFinite(values.lumper_amount) ? values.lumper_amount : null,
    currency: values.currency ?? "USD",
    cancellation_flag: values.cancellation_flag ?? null,
    layover_reason: values.layover_reason ?? null,
    notes: values.notes ?? null,
    confidence_score: values.confidence_score,
  };
}

async function touchLoadStopFromReview(loadId: string, review: ReturnType<typeof documentReviewSchema.parse>) {
  const stop = await prisma.stop.findFirst({
    where: {
      loadId,
      type: "DELIVERY",
    },
    orderBy: { createdAt: "asc" },
  });

  if (!stop) {
    return;
  }

  const updateData = {
    appointmentStart: review.appointment_time ? new Date(review.appointment_time) : stop.appointmentStart,
    arrivalTime: review.arrival_time ? new Date(review.arrival_time) : stop.arrivalTime,
    checkInTime: review.check_in_time ? new Date(review.check_in_time) : stop.checkInTime,
    dockInTime: review.dock_in_time ? new Date(review.dock_in_time) : stop.dockInTime,
    loadedOutTime: review.loaded_out_time ? new Date(review.loaded_out_time) : stop.loadedOutTime,
    departureTime: review.departure_time ? new Date(review.departure_time) : stop.departureTime,
  };

  await prisma.stop.update({
    where: { id: stop.id },
    data: updateData,
  });
}

export async function startDemoAction() {
  await startDemoSession();
  return { success: true };
}

export async function clearDemoAction() {
  await clearDemoSession();
  redirect("/login");
}

export async function createCustomerAction(input: unknown) {
  const context = await requireRole(["OWNER", "OPS", "BILLING"]);
  const values = customerSchema.parse(input);

  const customer = await prisma.customer.create({
    data: {
      organizationId: context.organization.id,
      name: values.name,
      billingEmail: values.billingEmail || null,
      status: values.status,
      notes: values.notes || null,
    },
  });

  await createAuditLog({
    organizationId: context.organization.id,
    userId: context.user.id,
    entityType: "Customer",
    entityId: customer.id,
    action: "created",
  });

  revalidatePath("/app/customers");
  return customer;
}

export async function createFacilityAction(input: unknown) {
  const context = await requireRole(["OWNER", "OPS", "BILLING"]);
  const values = facilitySchema.parse(input);

  const facility = await prisma.facility.create({
    data: {
      organizationId: context.organization.id,
      customerId: values.customerId,
      name: values.name,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      timezone: values.timezone,
      notes: values.notes || null,
    },
  });

  await createAuditLog({
    organizationId: context.organization.id,
    userId: context.user.id,
    entityType: "Facility",
    entityId: facility.id,
    action: "created",
  });

  revalidatePath("/app/facilities");
  return facility;
}

export async function createRuleAction(input: unknown) {
  const context = await requireRole(["OWNER", "OPS", "BILLING"]);
  const values = ruleSetSchema.parse(input);

  const rule = await prisma.ruleSet.create({
    data: {
      organizationId: context.organization.id,
      customerId: values.customerId || null,
      facilityId: values.facilityId || null,
      name: values.name,
      priority: values.priority,
      isDefault: values.isDefault,
      currency: values.currency,
      active: true,
      detentionEnabled: values.detentionEnabled,
      detentionFreeMinutes: values.detentionFreeMinutes,
      detentionRatePerHour: values.detentionRatePerHour,
      detentionBillingIncrementMinutes: values.detentionBillingIncrementMinutes,
      detentionRoundingMode: values.detentionRoundingMode,
      detentionCapAmount:
        typeof values.detentionCapAmount === "number" && Number.isFinite(values.detentionCapAmount)
          ? values.detentionCapAmount
          : null,
      layoverEnabled: values.layoverEnabled,
      layoverFlatAmount: values.layoverFlatAmount,
      tonuEnabled: values.tonuEnabled,
      tonuFlatAmount: values.tonuFlatAmount,
      lumperEnabled: values.lumperEnabled,
      lumperCapAmount:
        typeof values.lumperCapAmount === "number" && Number.isFinite(values.lumperCapAmount)
          ? values.lumperCapAmount
          : null,
      notes: values.notes || null,
      effectiveStartDate: new Date(),
    },
  });

  await createAuditLog({
    organizationId: context.organization.id,
    userId: context.user.id,
    entityType: "RuleSet",
    entityId: rule.id,
    action: "created",
  });

  revalidatePath("/app/rules");
  return rule;
}

export async function inviteTeammateAction(input: unknown) {
  const context = await requireRole(["OWNER"]);
  const values = inviteSchema.parse(input);
  const token = crypto.randomUUID();

  const invitation = await prisma.invitation.create({
    data: {
      organizationId: context.organization.id,
      email: values.email.toLowerCase(),
      role: values.role,
      token,
      invitedByUserId: context.user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
  if (mailProvider.isConfigured) {
    await mailProvider.sendMail({
      to: values.email,
      subject: `You have been invited to ${context.organization.name} on DockClaim`,
      text: `You have been invited to join ${context.organization.name} on DockClaim as ${values.role}. Accept here: ${inviteUrl}`,
    });
  }

  await createAuditLog({
    organizationId: context.organization.id,
    userId: context.user.id,
    entityType: "Invitation",
    entityId: invitation.id,
    action: "created",
    metadataJson: {
      email: values.email,
      role: values.role,
    },
  });

  revalidatePath("/app/settings");
  return {
    invitation,
    inviteUrl,
    emailed: mailProvider.isConfigured,
  };
}

export async function acceptInvitationAction(token: string) {
  const context = await requireAppContext();

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    throw new Error("This invitation is no longer valid.");
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      organizationId: invitation.organizationId,
      userId: context.user.id,
    },
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        organizationId: invitation.organizationId,
        userId: context.user.id,
        role: invitation.role,
      },
    });
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  revalidatePath("/app/settings");
  redirect("/app/dashboard");
}

export async function commitCsvImportAction(input: unknown) {
  const context = await requireRole(["OWNER", "OPS", "BILLING"]);
  const values = importCommitSchema.parse(input);

  const result = await commitCsvImport({
    organizationId: context.organization.id,
    fileName: values.fileName,
    mapping: values.mapping,
    rows: values.rows,
    saveTemplate: values.saveTemplate,
    templateName: values.templateName,
  });

  await createAuditLog({
    organizationId: context.organization.id,
    userId: context.user.id,
    entityType: "CsvImportJob",
    entityId: result.jobId,
    action: "completed",
    metadataJson: result,
  });

  revalidatePath("/app/imports");
  revalidatePath("/app/loads");
  revalidatePath("/app/dashboard");
  return result;
}

export async function uploadDocumentAction(formData: FormData) {
  const context = await requireRole(["OWNER", "OPS", "BILLING"]);
  const loadId = String(formData.get("loadId") ?? "");
  const documentType = String(formData.get("documentType") ?? "OTHER");
  const file = formData.get("file");

  if (!loadId || !(file instanceof File) || file.size === 0) {
    throw new Error("A load and a document file are required.");
  }

  if (!["application/pdf", "image/png", "image/jpeg", "text/csv"].includes(file.type)) {
    throw new Error("Only PDF, PNG, JPG/JPEG, and CSV files are supported.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Files larger than 10 MB are not allowed.");
  }

  const uploaded = await storageProvider.uploadFile({
    file,
    folder: `dockclaim/${context.organization.slug}/${loadId}`,
    fileNameBase: `${Date.now()}-${file.name}`,
  });

  const extraction = await aiProvider.extractDocument({
    fileName: file.name,
    fileType: file.type,
    assetUrl: uploaded.storageUrl,
    promptContext: `Organization: ${context.organization.name}. Document type hint: ${documentType}.`,
  });

  const document = await prisma.document.create({
    data: {
      organizationId: context.organization.id,
      loadId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath: uploaded.storagePath,
      storageUrl: uploaded.storageUrl,
      documentType: documentType as
        | "BOL"
        | "POD"
        | "LUMPER_RECEIPT"
        | "RATE_CONFIRMATION"
        | "EMAIL_SCREENSHOT"
        | "CHECKIN_SCREENSHOT"
        | "OTHER",
      uploadedByUserId: context.user.id,
      extractionStatus: extraction ? "SUCCESS" : featureFlags.isAiEnabled ? "FAILED" : "MANUAL",
      extractionConfidence: extraction?.confidence_score ?? 0,
      rawExtractionJson: extraction ?? undefined,
    },
  });

  if (extraction) {
    await prisma.extractedField.createMany({
      data: Object.entries(extraction)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => ({
          documentId: document.id,
          fieldName: key,
          fieldValue: typeof value === "string" ? value : JSON.stringify(value),
          confidence: extraction.confidence_score,
        })),
    });
  }

  await recalculateLoadCandidates(context.organization.id, loadId);
  revalidatePath(`/app/loads/${loadId}`);
  revalidatePath("/app/loads");
  return document;
}

export async function reviewDocumentAction(documentId: string, input: unknown) {
  const context = await requireRole(["OWNER", "OPS", "BILLING"]);
  const values = documentReviewSchema.parse(input);
  const document = await prisma.document.findFirstOrThrow({
    where: {
      id: documentId,
      organizationId: context.organization.id,
    },
  });

  const reviewed = serializeExtractionReview(values);
  extractionSchema.parse(reviewed);

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: document.id },
      data: {
        documentType: values.documentType,
        extractionStatus: "NEEDS_REVIEW",
        reviewedExtractionJson: reviewed as Prisma.InputJsonValue,
        reviewedAt: new Date(),
        reviewedByUserId: context.user.id,
        extractionConfidence: values.confidence_score,
      },
    });

    await tx.extractedField.deleteMany({
      where: {
        documentId,
      },
    });

    await tx.extractedField.createMany({
      data: Object.entries(reviewed)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([fieldName, fieldValue]) => ({
          documentId,
          fieldName,
          fieldValue: typeof fieldValue === "string" ? fieldValue : JSON.stringify(fieldValue),
          confidence: values.confidence_score,
        })),
    });
  });

  await touchLoadStopFromReview(document.loadId, values);
  await recalculateLoadCandidates(context.organization.id, document.loadId);

  revalidatePath(`/app/loads/${document.loadId}`);
  return { success: true };
}

export async function createClaimAction(loadId: string) {
  const context = await requireRole(["OWNER", "OPS", "BILLING"]);
  const claim = await createOrRefreshClaimForLoad({
    organizationId: context.organization.id,
    loadId,
    createdByUserId: context.user.id,
  });

  await createAuditLog({
    organizationId: context.organization.id,
    userId: context.user.id,
    entityType: "Claim",
    entityId: claim.id,
    action: "created_or_refreshed",
  });

  revalidatePath(`/app/loads/${loadId}`);
  revalidatePath(`/app/claims/${claim.id}`);
  revalidatePath("/app/claims");
  return claim;
}

export async function updateClaimStatusAction(claimId: string, input: unknown) {
  const context = await requireRole(["OWNER", "OPS", "BILLING"]);
  const values = claimStatusSchema.parse(input);

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: {
      status: values.status,
      sentAt: values.status === "SENT" ? new Date() : undefined,
      paidAt: values.status === "PAID" || values.status === "PARTIAL_PAID" ? new Date() : undefined,
      paidAmount:
        values.status === "PAID"
          ? undefined
          : typeof values.paidAmount === "number"
            ? values.paidAmount
            : undefined,
      disputeReason: values.disputeReason || null,
    },
  });

  await createAuditLog({
    organizationId: context.organization.id,
    userId: context.user.id,
    entityType: "Claim",
    entityId: claimId,
    action: "status_changed",
    metadataJson: values,
  });

  revalidatePath(`/app/claims/${claimId}`);
  revalidatePath("/app/claims");
  return updated;
}

export async function addClaimInternalNoteAction(claimId: string, input: unknown) {
  const context = await requireRole(["OWNER", "OPS", "BILLING"]);
  const values = internalNoteSchema.parse(input);

  const message = await prisma.claimMessage.create({
    data: {
      claimId,
      direction: "INTERNAL",
      subject: values.subject,
      body: values.body,
    },
  });

  await createAuditLog({
    organizationId: context.organization.id,
    userId: context.user.id,
    entityType: "ClaimMessage",
    entityId: message.id,
    action: "internal_note_added",
  });

  revalidatePath(`/app/claims/${claimId}`);
  return message;
}

export async function sendClaimEmailAction(claimId: string) {
  const context = await requireRole(["OWNER", "OPS", "BILLING"]);
  const claim = await getClaimDetail(context.organization.id, claimId);
  const draftMessage = claim.messages.find((message) => message.direction === "OUTBOUND");
  const subject = draftMessage?.subject ?? `${claim.claimNumber} accessorial claim`;
  const body = draftMessage?.body ?? "";
  const to = claim.customer.billingEmail;

  if (!mailProvider.isConfigured || !to) {
    return {
      sent: false,
      reason: !to ? "Customer billing email is missing." : "SMTP is not configured.",
      subject,
      body,
    };
  }

  const sanitized = sanitizeHtml(body, {
    allowedTags: [],
    allowedAttributes: {},
  });
  const sent = await mailProvider.sendMail({
    to,
    subject,
    text: sanitized,
  });

  if (sent.sent) {
    await prisma.claim.update({
      where: { id: claim.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await prisma.claimMessage.create({
      data: {
        claimId: claim.id,
        direction: "OUTBOUND",
        subject,
        body,
        sentAt: new Date(),
      },
    });
  }

  revalidatePath(`/app/claims/${claimId}`);
  return {
    sent: sent.sent,
    subject,
    body,
    reason: sent.error,
  };
}

export async function createCheckoutSessionAction() {
  const context = await requireRole(["OWNER"]);
  const stripe = getStripeClient();

  if (!stripe || !featureFlags.isStripeConfigured || !env.STRIPE_PRICE_PRO_ID) {
    return {
      configured: false,
      reason: "Stripe billing is not configured.",
    };
  }

  try {
    const price = await stripe.prices.retrieve(env.STRIPE_PRICE_PRO_ID);
    if (!price.active) {
      return {
        configured: false,
        reason: "Stripe billing is misconfigured. The configured price is inactive.",
      };
    }

    let subscription = await prisma.subscription.findUnique({
      where: { organizationId: context.organization.id },
    });

    let customerId = subscription?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: context.user.email,
        name: context.organization.name,
        metadata: {
          organizationId: context.organization.id,
        },
      });
      customerId = customer.id;

      subscription = await prisma.subscription.upsert({
        where: { organizationId: context.organization.id },
        update: {
          stripeCustomerId: customerId,
        },
        create: {
          organizationId: context.organization.id,
          status: "TRIALING",
          trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
          stripeCustomerId: customerId,
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: env.STRIPE_PRICE_PRO_ID,
          quantity: 1,
        },
      ],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/app/settings/billing?checkout=success`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/app/settings/billing?checkout=cancelled`,
      metadata: {
        organizationId: context.organization.id,
        subscriptionId: subscription?.id ?? "",
      },
    });

    return {
      configured: true,
      url: session.url,
    };
  } catch (error) {
    console.error("Stripe checkout initialization failed", error);
    return {
      configured: false,
      reason: "Stripe billing is misconfigured. Check STRIPE_PRICE_PRO_ID and account keys.",
    };
  }
}
