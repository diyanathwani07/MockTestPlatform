import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--border-color)]/50", className)}
      {...props}
    />
  );
}

export { Skeleton };
