import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signupSchema = loginSchema.extend({
  fullName: z.string().min(2),
  organizationName: z.string().min(2),
  inviteToken: z.string().optional(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "OPS", "BILLING", "VIEWER"]),
});

export const customerSchema = z.object({
  name: z.string().min(2),
  billingEmail: z.string().email().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  notes: z.string().optional(),
});

export const facilitySchema = z.object({
  customerId: z.string().cuid(),
  name: z.string().min(2),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  timezone: z.string().min(2),
  notes: z.string().optional(),
});

export const ruleSetSchema = z.object({
  name: z.string().min(2),
  customerId: z.string().cuid().optional().or(z.literal("")),
  facilityId: z.string().cuid().optional().or(z.literal("")),
  priority: z.coerce.number().int().min(0).default(1),
  isDefault: z.boolean().default(false),
  currency: z.string().min(3).max(3).default("USD"),
  detentionEnabled: z.boolean().default(true),
  detentionFreeMinutes: z.coerce.number().int().min(0).default(120),
  detentionRatePerHour: z.coerce.number().min(0).default(85),
  detentionBillingIncrementMinutes: z.coerce.number().int().min(15).default(60),
  detentionRoundingMode: z.enum(["UP", "NEAREST", "DOWN"]).default("UP"),
  detentionCapAmount: z.union([z.coerce.number().min(0), z.nan()]).optional(),
  layoverEnabled: z.boolean().default(true),
  layoverFlatAmount: z.coerce.number().min(0).default(250),
  tonuEnabled: z.boolean().default(true),
  tonuFlatAmount: z.coerce.number().min(0).default(175),
  lumperEnabled: z.boolean().default(true),
  lumperCapAmount: z.union([z.coerce.number().min(0), z.nan()]).optional(),
  notes: z.string().optional(),
});

export const importCommitSchema = z.object({
  templateName: z.string().optional(),
  saveTemplate: z.boolean().default(false),
  mapping: z.record(z.string(), z.string()),
  rows: z.array(z.record(z.string(), z.string().nullable().optional())),
  fileName: z.string().min(1),
});

export const documentReviewSchema = z.object({
  documentType: z.enum([
    "BOL",
    "POD",
    "LUMPER_RECEIPT",
    "RATE_CONFIRMATION",
    "EMAIL_SCREENSHOT",
    "CHECKIN_SCREENSHOT",
    "OTHER",
  ]),
  referenced_load_number: z.string().optional().nullable(),
  customer_name: z.string().optional().nullable(),
  facility_name: z.string().optional().nullable(),
  appointment_time: z.string().optional().nullable(),
  arrival_time: z.string().optional().nullable(),
  check_in_time: z.string().optional().nullable(),
  dock_in_time: z.string().optional().nullable(),
  loaded_out_time: z.string().optional().nullable(),
  departure_time: z.string().optional().nullable(),
  lumper_amount: z.union([z.coerce.number().min(0), z.nan()]).optional(),
  currency: z.string().optional().nullable(),
  cancellation_flag: z.boolean().optional().nullable(),
  layover_reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  confidence_score: z.coerce.number().min(0).max(1).default(0),
});

export const claimStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "READY_TO_SEND",
    "SENT",
    "PARTIAL_PAID",
    "PAID",
    "DISPUTED",
    "WRITTEN_OFF",
  ]),
  disputeReason: z.string().optional(),
  paidAmount: z.coerce.number().optional(),
});

export const internalNoteSchema = z.object({
  subject: z.string().min(2),
  body: z.string().min(2),
});
