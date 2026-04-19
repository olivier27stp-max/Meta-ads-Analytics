import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none tabular whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-muted/70 border-border text-foreground",
        muted: "bg-transparent border-border text-muted-foreground",
        success: "bg-success-soft border-success/30 text-success",
        warning: "bg-warning-soft border-warning/30 text-warning",
        danger: "bg-danger-soft border-danger/30 text-danger",
        info: "bg-info-soft border-info/25 text-info",
        funnel: "bg-muted/70 border-border text-foreground font-semibold tracking-wide",
      },
      size: {
        sm: "text-[10px] px-1.5 py-0.5",
        md: "text-[11px] px-2 py-0.5",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
