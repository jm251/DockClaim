import * as React from "react";

import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table className={cn("text-fluid-sm w-full caption-bottom", className)} {...props} />;
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b border-[var(--border)] transition hover:bg-[var(--surface-subtle)]", className)} {...props} />;
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "text-eyebrow h-11 px-3 text-left text-[var(--foreground-soft)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-3 align-middle text-[var(--foreground)]", className)} {...props} />;
}
