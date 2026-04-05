import { Badge } from "@/components/ui/badge";

const variantMap: Record<string, "default" | "success" | "warning" | "danger" | "secondary"> = {
  ACTIVE: "success",
  TRIALING: "warning",
  INACTIVE: "warning",
  PENDING: "warning",
  ACCEPTED: "success",
  IMPORTED: "secondary",
  READY: "success",
  IN_REVIEW: "warning",
  CLAIMED: "secondary",
  DRAFT: "secondary",
  READY_TO_SEND: "warning",
  SENT: "secondary",
  PARTIAL_PAID: "warning",
  PAID: "success",
  DISPUTED: "danger",
  WRITTEN_OFF: "danger",
  ELIGIBLE: "success",
  NOT_ELIGIBLE: "default",
  MISSING_EVIDENCE: "warning",
  NEEDS_REVIEW: "warning",
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge variant={variantMap[value] ?? "default"}>{value.replace(/_/g, " ")}</Badge>;
}
