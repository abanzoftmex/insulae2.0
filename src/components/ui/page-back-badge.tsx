"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export interface PageBackBadgeProps {
  className?: string;
  "aria-label"?: string;
}

export function PageBackBadge({
  className,
  "aria-label": ariaLabel = "Volver a la página anterior",
}: PageBackBadgeProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label={ariaLabel}
      className={cn(
        "group inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-line/70 bg-card/80 px-2.5 text-brand shadow-sm backdrop-blur-sm transition-standard",
        "hover:border-brand/35 hover:bg-brand/6 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
        "active:scale-[0.96]",
        className
      )}
    >
      <ArrowLeft
        className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
        strokeWidth={2.25}
        aria-hidden
      />
    </button>
  );
}
