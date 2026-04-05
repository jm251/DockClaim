"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "text-fluid-sm inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--primary)] px-4 py-2.5 text-[var(--primary-foreground)] shadow-[0_14px_32px_rgba(184,106,49,0.16)] hover:translate-y-[-1px] hover:bg-[var(--primary-hover)]",
        secondary:
          "border-transparent bg-[var(--secondary)] px-4 py-2.5 text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)]",
        outline:
          "border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5 text-[var(--foreground)] hover:bg-[var(--surface)]",
        ghost: "border-transparent bg-transparent px-3 py-2 text-[var(--foreground)] hover:bg-[var(--surface-subtle)]",
        danger: "border-transparent bg-[var(--danger)] px-4 py-2.5 text-white hover:bg-[#873429]",
      },
      size: {
        sm: "h-9 px-3 text-fluid-xs",
        default: "h-11 px-4 sm:px-5",
        lg: "h-12 px-5 text-fluid-base sm:px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} type={type} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
