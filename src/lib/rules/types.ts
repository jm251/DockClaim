import type { AccessorialType, DetentionRoundingMode, EligibilityStatus } from "@prisma/client";

export interface RuleSetSnapshot {
  id: string;
  name: string;
  currency: string;
  detentionEnabled: boolean;
  detentionFreeMinutes: number;
  detentionRatePerHour: number;
  detentionBillingIncrementMinutes: number;
  detentionRoundingMode: DetentionRoundingMode;
  detentionCapAmount: number | null;
  layoverEnabled: boolean;
  layoverFlatAmount: number;
  tonuEnabled: boolean;
  tonuFlatAmount: number;
  lumperEnabled: boolean;
  lumperCapAmount: number | null;
}

export interface StopSnapshot {
  id: string;
  type: "PICKUP" | "DELIVERY";
  timezone: string;
  facilityName: string;
  appointmentStart: Date | null;
  appointmentEnd: Date | null;
  arrivalTime: Date | null;
  checkInTime: Date | null;
  dockInTime: Date | null;
  loadedOutTime: Date | null;
  departureTime: Date | null;
}

export interface LoadSnapshot {
  id: string;
  pickupDate: Date;
  deliveryDate: Date;
  notes?: string | null;
}

export interface EvidenceSnapshot {
  layoverReason?: string | null;
  layoverDate?: Date | null;
  cancellationFlag?: boolean;
  hasRateConfirmation?: boolean;
  hasLumperReceipt?: boolean;
  lumperAmount?: number | null;
  lumperOverrideAmount?: number | null;
  lumperOverrideNote?: string | null;
  notes?: string[];
}

export interface CandidateResult {
  type: AccessorialType;
  eligibilityStatus: EligibilityStatus;
  calculatedAmount: number;
  currency: string;
  explanation: string;
  evidenceSummary: string;
  stopId?: string;
  ruleSetId: string;
  calculationJson: Record<string, unknown>;
}
