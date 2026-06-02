"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export type PaginatorProps = {
  page: number;
  totalPages: number;
  totalRows?: number;
  hasPrev: boolean;
  hasNext: boolean;
  prevHref: string;
  nextHref: string;
};

export function Paginator({ page, totalPages, totalRows, hasPrev, hasNext, prevHref, nextHref }: PaginatorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (totalPages <= 1) return null;

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 tabular-nums">
          {totalRows !== undefined && <span>{totalRows} unidades &middot; </span>}
          <span>página {page} de {totalPages}</span>
        </p>
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(prevHref)}
          disabled={!hasPrev || isPending}
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-brand hover:text-white hover:border-brand disabled:opacity-30 disabled:pointer-events-none"
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </button>
        <button
          onClick={() => navigate(nextHref)}
          disabled={!hasNext || isPending}
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-brand hover:text-white hover:border-brand disabled:opacity-30 disabled:pointer-events-none"
          )}
        >
          Siguiente <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
