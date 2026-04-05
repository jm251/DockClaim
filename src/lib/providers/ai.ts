import { env, featureFlags } from "@/lib/env";
import { extractionSchema, type ExtractionResult } from "@/lib/extraction-schema";

export { extractionSchema };

export interface AiExtractionProvider {
  isConfigured: boolean;
  extractDocument(input: {
    fileName: string;
    fileType: string;
    assetUrl: string;
    promptContext?: string;
  }): Promise<ExtractionResult | null>;
  polishClaimDraft?(input: { subject: string; body: string }): Promise<{ subject: string; body: string }>;
}

const documentTypeAliases: Record<string, ExtractionResult["document_type"]> = {
  BOL: "BOL",
  POD: "POD",
  LUMPER_RECEIPT: "LUMPER_RECEIPT",
  LUMPER: "LUMPER_RECEIPT",
  RATE_CONFIRMATION: "RATE_CONFIRMATION",
  RATE_CON: "RATE_CONFIRMATION",
  RATECONFIRMATION: "RATE_CONFIRMATION",
  EMAIL_SCREENSHOT: "EMAIL_SCREENSHOT",
  EMAIL: "EMAIL_SCREENSHOT",
  CHECKIN_SCREENSHOT: "CHECKIN_SCREENSHOT",
  CHECK_IN_SCREENSHOT: "CHECKIN_SCREENSHOT",
  CHECKIN: "CHECKIN_SCREENSHOT",
  CHECK_IN: "CHECKIN_SCREENSHOT",
  OTHER: "OTHER",
};

function normalizeNullableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return String(value);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== "null" ? trimmed : null;
}

function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeNullableBoolean(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "0"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function normalizeDocumentType(value: unknown): ExtractionResult["document_type"] {
  const normalized = normalizeNullableString(value)
    ?.toUpperCase()
    .replace(/[^A-Z]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (!normalized) {
    return "OTHER";
  }

  return documentTypeAliases[normalized] ?? "OTHER";
}

function normalizeExtractionPayload(payload: Record<string, unknown>) {
  return {
    document_type: normalizeDocumentType(payload.document_type),
    referenced_load_number: normalizeNullableString(payload.referenced_load_number),
    customer_name: normalizeNullableString(payload.customer_name),
    facility_name: normalizeNullableString(payload.facility_name),
    appointment_time: normalizeNullableString(payload.appointment_time),
    arrival_time: normalizeNullableString(payload.arrival_time),
    check_in_time: normalizeNullableString(payload.check_in_time),
    dock_in_time: normalizeNullableString(payload.dock_in_time),
    loaded_out_time: normalizeNullableString(payload.loaded_out_time),
    departure_time: normalizeNullableString(payload.departure_time),
    lumper_amount: normalizeNullableNumber(payload.lumper_amount),
    currency: normalizeNullableString(payload.currency)?.toUpperCase() ?? "USD",
    cancellation_flag: normalizeNullableBoolean(payload.cancellation_flag),
    layover_reason: normalizeNullableString(payload.layover_reason),
    notes: normalizeNullableString(payload.notes),
    confidence_score: normalizeNullableNumber(payload.confidence_score) ?? 0,
  };
}

class FastRouterExtractionProvider implements AiExtractionProvider {
  isConfigured = featureFlags.isAiEnabled;

  async extractDocument(input: {
    fileName: string;
    fileType: string;
    assetUrl: string;
    promptContext?: string;
  }) {
    if (!this.isConfigured || !env.FASTROUTER_API_KEY) {
      return null;
    }

    const response = await fetch(env.FASTROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.FASTROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.FASTROUTER_MODEL,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You classify freight claim support documents and extract structured timestamps, load references, customer/facility names, and lumper amounts. Return valid JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract from this support document.\nFilename: ${input.fileName}\nFile type: ${input.fileType}\nContext: ${input.promptContext ?? "Freight accessorial claims for DockClaim."}\nReturn JSON with keys: ${Object.keys(
                  extractionSchema.shape,
                ).join(", ")}.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: input.assetUrl,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "dockclaim_document_extraction",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                document_type: { type: "string" },
                referenced_load_number: { type: ["string", "null"] },
                customer_name: { type: ["string", "null"] },
                facility_name: { type: ["string", "null"] },
                appointment_time: { type: ["string", "null"] },
                arrival_time: { type: ["string", "null"] },
                check_in_time: { type: ["string", "null"] },
                dock_in_time: { type: ["string", "null"] },
                loaded_out_time: { type: ["string", "null"] },
                departure_time: { type: ["string", "null"] },
                lumper_amount: { type: ["number", "null"] },
                currency: { type: ["string", "null"] },
                cancellation_flag: { type: ["boolean", "null"] },
                layover_reason: { type: ["string", "null"] },
                notes: { type: ["string", "null"] },
                confidence_score: { type: "number" },
              },
              required: [
                "document_type",
                "referenced_load_number",
                "customer_name",
                "facility_name",
                "appointment_time",
                "arrival_time",
                "check_in_time",
                "dock_in_time",
                "loaded_out_time",
                "departure_time",
                "lumper_amount",
                "currency",
                "cancellation_flag",
                "layover_reason",
                "notes",
                "confidence_score",
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return extractionSchema.parse(normalizeExtractionPayload(parsed));
    } catch {
      return null;
    }
  }

  async polishClaimDraft(input: { subject: string; body: string }) {
    if (!this.isConfigured || !env.FASTROUTER_API_KEY) {
      return input;
    }

    const response = await fetch(env.FASTROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.FASTROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.FASTROUTER_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Polish freight claim email copy without changing requested amounts or factual details. Return valid JSON with subject and body.",
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "dockclaim_email_draft",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                subject: { type: "string" },
                body: { type: "string" },
              },
              required: ["subject", "body"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      return input;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return input;
    }

    try {
      const parsed = JSON.parse(content) as { subject: string; body: string };
      return {
        subject: parsed.subject,
        body: parsed.body,
      };
    } catch {
      return input;
    }
  }
}

export const aiProvider = new FastRouterExtractionProvider();
