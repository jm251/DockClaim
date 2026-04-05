import * as React from "react";

import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("text-fluid-sm mb-2 block font-medium text-[var(--foreground)]", className)} {...props} />
  );
}
