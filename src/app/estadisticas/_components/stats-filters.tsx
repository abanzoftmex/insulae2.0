"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FilterX } from "lucide-react";

export function StatsFilters({
  zones,
  useTypes,
  currentZone,
  currentUseType,
}: {
  zones: string[];
  useTypes: string[];
  currentZone: string | null;
  currentUseType: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const applyFilter = (key: "zona" | "uso", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.replace(`/estadisticas${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
    });
  };

  const hasFilters = Boolean(currentZone || currentUseType);
  const selectClass =
    "h-9 rounded-lg border border-line bg-card px-3 text-[12px] font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 max-w-full";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${isPending ? "opacity-60" : ""}`}>
      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">Barrio</label>
      <select
        className={selectClass}
        value={currentZone ?? ""}
        onChange={(event) => applyFilter("zona", event.target.value)}
      >
        <option value="">Todos</option>
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>
      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70 ml-2">Uso de suelo</label>
      <select
        className={selectClass + " max-w-[260px]"}
        value={currentUseType ?? ""}
        onChange={(event) => applyFilter("uso", event.target.value)}
      >
        <option value="">Todos</option>
        {useTypes.map((useType) => (
          <option key={useType} value={useType}>
            {useType}
          </option>
        ))}
      </select>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            startTransition(() => router.replace("/estadisticas", { scroll: false }));
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold text-terracotta hover:bg-terracotta/5 transition-colors"
        >
          <FilterX className="w-3.5 h-3.5" />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
