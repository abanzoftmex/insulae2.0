import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils/cn"; // Assuming this utility exists, if not I'll create it

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-pill text-sm font-semibold transition-standard active-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-accent text-white hover:shadow-lg",
        outline: "border border-brand-accent text-brand-accent hover:bg-brand-accent/5",
        ghost: "hover:bg-canvas text-ink",
        subtle: "bg-canvas text-brand hover:bg-[#f8f8f7]",
        dark: "bg-brand-deep text-white hover:bg-brand-uplift",
        destructive: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
