import * as React from "react";
import { cn } from "@/shared/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label
          htmlFor={inputId}
          className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none"
        >
          {label}
        </label>
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium transition-standard file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          id={inputId}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label
          htmlFor={inputId}
          className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none"
        >
          {label}
        </label>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-line bg-card px-3 py-2 text-[13px] font-medium transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          id={inputId}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
