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
      <div className="relative group w-full">
        <input
          type={type}
          className={cn(
            "peer flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium transition-standard file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          id={inputId}
          ref={ref}
          placeholder={label}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60 transition-all peer-placeholder-shown:text-[12px] peer-placeholder-shown:font-bold peer-placeholder-shown:text-ink-soft/40 peer-placeholder-shown:top-2 peer-placeholder-shown:bg-transparent peer-focus:-top-1.5 peer-focus:px-1 peer-focus:bg-card peer-focus:text-[10px] peer-focus:font-black peer-focus:text-brand-accent pointer-events-none"
        >
          {label}
        </label>
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
      <div className="relative group w-full">
        <textarea
          className={cn(
            "peer flex min-h-[80px] w-full rounded-md border border-line bg-card px-3 py-2 text-[13px] font-medium transition-standard placeholder:text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          id={inputId}
          ref={ref}
          placeholder={label}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60 transition-all peer-placeholder-shown:text-[12px] peer-placeholder-shown:font-bold peer-placeholder-shown:text-ink-soft/40 peer-placeholder-shown:top-2 peer-placeholder-shown:bg-transparent peer-focus:-top-1.5 peer-focus:px-1 peer-focus:bg-card peer-focus:text-[10px] peer-focus:font-black peer-focus:text-brand-accent pointer-events-none"
        >
          {label}
        </label>
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
