import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({
  hasActions = true,
  className,
}: {
  hasActions?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 flex-1 space-y-4">
        <Skeleton className="h-4 w-24 rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-11 w-[min(100%,34rem)]" />
          <Skeleton className="h-5 w-[min(100%,42rem)]" />
          <Skeleton className="h-5 w-[min(92%,31rem)]" />
        </div>
      </div>
      {hasActions ? (
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-11 w-28" />
        </div>
      ) : null}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[82%]" />
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({
  columns = 6,
  rows = 6,
  showFilter = true,
}: {
  columns?: number;
  rows?: number;
  showFilter?: boolean;
}) {
  return (
    <div className="space-y-4">
      {showFilter ? <Skeleton className="h-12 w-full max-w-md" /> : null}
      <div className="overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-panel">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid gap-3 border-b border-[var(--border)] px-3 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {Array.from({ length: columns }, (_, index) => (
                <Skeleton className="h-4 w-20 rounded-full" key={`head-${index}`} />
              ))}
            </div>
            <div className="divide-y divide-[var(--border)]">
              {Array.from({ length: rows }, (_, rowIndex) => (
                <div className="grid gap-3 px-3 py-4" key={`row-${rowIndex}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                  {Array.from({ length: columns }, (_, columnIndex) => (
                    <Skeleton
                      className={cn(
                        "h-5",
                        columnIndex === columns - 1 ? "ml-auto w-16" : columnIndex === 0 ? "w-24" : "w-full max-w-[10rem]",
                      )}
                      key={`cell-${rowIndex}-${columnIndex}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetailCardSkeleton({
  sections = 3,
  className,
}: {
  sections?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-[82%]" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: sections }, (_, index) => (
          <div className="surface-subtle space-y-3 rounded-2xl border p-4" key={index}>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[88%]" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function WorkspaceRouteSkeleton() {
  return (
    <div className="space-y-6" data-testid="workspace-loading">
      <PageHeaderSkeleton />
      <div className="grid gap-4 xl:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}

export function LoadDetailSkeleton() {
  return (
    <div className="space-y-6" data-testid="load-detail-loading">
      <PageHeaderSkeleton />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <DetailCardSkeleton sections={4} />
          <DetailCardSkeleton sections={3} />
          <DetailCardSkeleton sections={3} />
        </div>
        <div className="space-y-6">
          <DetailCardSkeleton sections={2} />
          <DetailCardSkeleton sections={2} />
          <DetailCardSkeleton sections={2} />
        </div>
      </div>
    </div>
  );
}

export function ClaimDetailSkeleton() {
  return (
    <div className="space-y-6" data-testid="claim-detail-loading">
      <PageHeaderSkeleton />
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <DetailCardSkeleton sections={3} />
          <DetailCardSkeleton sections={4} />
          <DetailCardSkeleton sections={2} />
        </div>
        <div className="space-y-6">
          <DetailCardSkeleton sections={2} />
          <DetailCardSkeleton sections={3} />
        </div>
      </div>
    </div>
  );
}
