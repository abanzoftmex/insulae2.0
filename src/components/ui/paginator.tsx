"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (totalPages <= 1) return null;

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(pageNumber));
    return `${pathname}?${params.toString()}`;
  };

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-2 bg-[#faf6f0]/30 rounded-2xl border border-line/30">
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 tabular-nums">
          {totalRows !== undefined && <span>{totalRows} unidades &middot; </span>}
          <span>página {page} de {totalPages}</span>
        </p>
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />}
      </div>

      <div className="flex items-center flex-wrap gap-1.5">
        <button
          onClick={() => navigate(createPageUrl(Math.max(1, page - 1)))}
          disabled={!hasPrev || isPending}
          className={cn(
            "flex items-center gap-1 h-8 px-2.5 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-[#5a4838] hover:text-white hover:border-[#5a4838] disabled:opacity-30 disabled:pointer-events-none"
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Ant.
        </button>

        {getPageNumbers().map((pageNum) => {
          const isActive = pageNum === page;

          return (
            <button
              key={`page-${pageNum}`}
              onClick={() => navigate(createPageUrl(pageNum))}
              disabled={isPending}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-full border text-[10px] font-bold transition-all",
                isActive
                  ? "bg-[#5a4838] border-[#5a4838] text-white shadow-sm"
                  : "bg-white border-line text-ink hover:bg-[#5a4838]/10 hover:text-[#5a4838] hover:border-[#5a4838]/30"
              )}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => navigate(createPageUrl(Math.min(totalPages, page + 1)))}
          disabled={!hasNext || isPending}
          className={cn(
            "flex items-center gap-1 h-8 px-2.5 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-[#5a4838] hover:text-white hover:border-[#5a4838] disabled:opacity-30 disabled:pointer-events-none"
          )}
        >
          Sig. <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
