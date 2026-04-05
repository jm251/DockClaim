import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("text-fluid-xs inline-flex items-center rounded-full border px-2.5 py-1 font-semibold", {
  variants: {
    variant: {
      default: "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]",
      success: "border-[rgba(47,122,75,0.18)] bg-[rgba(47,122,75,0.12)] text-[var(--success)]",
      warning: "border-[rgba(166,106,30,0.18)] bg-[rgba(166,106,30,0.12)] text-[var(--warning)]",
      danger: "border-[rgba(156,62,49,0.18)] bg-[rgba(156,62,49,0.12)] text-[var(--danger)]",
      secondary: "border-[rgba(23,59,61,0.12)] bg-[rgba(23,59,61,0.1)] text-[var(--secondary)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
