import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--violet)] text-white shadow hover:opacity-90",
        secondary:
          "border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] hover:bg-[var(--option-hover)]",
        destructive:
          "border-transparent bg-red-500/10 text-red-500 border border-red-500/20",
        success:
          "border-transparent bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
        outline: "text-[var(--text-primary)] border-[var(--border-color)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
