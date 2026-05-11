import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-canvas text-ink-soft/60",
        success: "bg-brand-mint text-brand",
        warning: "bg-gold-soft text-gold",
        danger: "bg-danger/10 text-danger",
        brand:
          "border border-brand/25 bg-brand/15 text-brand shadow-sm",
        outline: "border border-line text-ink-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
