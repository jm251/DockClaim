import { z } from "zod";

export const extractionSchema = z.object({
  document_type: z
    .enum([
      "BOL",
      "POD",
      "LUMPER_RECEIPT",
      "RATE_CONFIRMATION",
      "EMAIL_SCREENSHOT",
      "CHECKIN_SCREENSHOT",
      "OTHER",
    ])
    .default("OTHER"),
  referenced_load_number: z.string().nullable().default(null),
  customer_name: z.string().nullable().default(null),
  facility_name: z.string().nullable().default(null),
  appointment_time: z.string().nullable().default(null),
  arrival_time: z.string().nullable().default(null),
  check_in_time: z.string().nullable().default(null),
  dock_in_time: z.string().nullable().default(null),
  loaded_out_time: z.string().nullable().default(null),
  departure_time: z.string().nullable().default(null),
  lumper_amount: z.number().nullable().default(null),
  currency: z.string().nullable().default("USD"),
  cancellation_flag: z.boolean().nullable().default(null),
  layover_reason: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  confidence_score: z.number().min(0).max(1).default(0),
});

export type ExtractionResult = z.infer<typeof extractionSchema>;
