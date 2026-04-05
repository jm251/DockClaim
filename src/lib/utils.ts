import { clsx, type ClassValue } from "clsx";
import { format, formatDistanceToNowStrict } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string, currency = "USD") {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) {
    return "Not available";
  }

  return format(new Date(value), "MMM d, yyyy h:mm a");
}

export function formatDateOnly(value?: Date | string | null) {
  if (!value) {
    return "Not available";
  }

  return format(new Date(value), "MMM d, yyyy");
}

export function relativeTime(value?: Date | string | null) {
  if (!value) {
    return "Not available";
  }

  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function sum(values: Array<number | string>) {
  return values.reduce<number>((total, value) => total + Number(value), 0);
}

export function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

export function truncate(value: string, max = 120) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

export function uniqueSlug(base: string, existing: Set<string>) {
  let next = base || "dockclaim";
  let index = 1;

  while (existing.has(next)) {
    next = `${base}-${index}`;
    index += 1;
  }

  return next;
}
