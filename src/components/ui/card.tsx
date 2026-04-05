import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("card-surface shadow-panel rounded-[30px] border border-[var(--border)]", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-start justify-between gap-4 p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-fluid-lg font-semibold tracking-tight text-[var(--foreground)]", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-fluid-sm leading-relaxed text-[var(--muted-foreground)]", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props} />;
}
