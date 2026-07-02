"use client";

import * as React from "react";
import { cn } from "@/shared/utils/cn";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = React.useState(false);

    const isPassword = type === "password";
    const actualType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none"
          >
            {label}
          </label>
        )}
        <div className="relative w-full">
          <input
            type={actualType}
            className={cn(
              "flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium transition-standard file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent disabled:cursor-not-allowed disabled:opacity-50",
              isPassword && "pr-10",
              className
            )}
            id={inputId}
            ref={ref}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md text-ink-soft hover:text-brand hover:bg-canvas transition-standard"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none"
          >
            {label}
          </label>
        )}
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
