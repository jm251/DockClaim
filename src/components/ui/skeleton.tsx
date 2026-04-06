import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-[rgba(216,205,187,0.58)]", className)}
      {...props}
    />
  );
}
