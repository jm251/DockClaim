import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "text-fluid-base min-h-[132px] w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-[var(--foreground)] shadow-sm outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
