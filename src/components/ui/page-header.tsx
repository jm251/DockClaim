import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="space-y-4">
        {eyebrow ? (
          <p className="text-eyebrow text-[var(--primary)]">{eyebrow}</p>
        ) : null}
        <div className="space-y-3">
          <h1 className="font-display text-fluid-3xl font-semibold text-balance text-[var(--foreground)]">
            {title}
          </h1>
          {description ? <p className="text-fluid-base max-w-3xl text-[var(--muted-foreground)]">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
