import { TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-eyebrow font-medium text-[var(--foreground-soft)]">
            {title}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-display text-fluid-2xl tabular-nums font-semibold text-[var(--foreground)]">{value}</div>
        <p className="text-fluid-sm mt-2 text-[var(--muted-foreground)]">{hint}</p>
      </CardContent>
    </Card>
  );
}
