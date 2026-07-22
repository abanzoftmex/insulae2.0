"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FilterX, Loader2 } from "lucide-react";

/**
 * Filtros compactos: viven en la barra sticky junto a la navegación, así que
 * las etiquetas van dentro del propio select en lugar de ocupar ancho aparte.
 */
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
    "h-8 rounded-lg border border-line bg-canvas-2/60 pl-2.5 pr-7 text-[12px] font-medium text-ink cursor-pointer " +
    "hover:bg-canvas-2 focus:outline-none focus:ring-2 focus:ring-brand/30 transition-standard truncate";

  return (
    <div className="flex items-center gap-2">
      {isPending && <Loader2 className="w-3.5 h-3.5 text-brand animate-spin shrink-0" />}
      <select
        className={`${selectClass} max-w-[152px]`}
        value={currentZone ?? ""}
        onChange={(event) => applyFilter("zona", event.target.value)}
        aria-label="Filtrar por barrio"
      >
        <option value="">Todos los barrios</option>
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>
      <select
        className={`${selectClass} max-w-[196px]`}
        value={currentUseType ?? ""}
        onChange={(event) => applyFilter("uso", event.target.value)}
        aria-label="Filtrar por uso de suelo"
      >
        <option value="">Todos los usos de suelo</option>
        {useTypes.map((useType) => (
          <option key={useType} value={useType}>
            {useType}
          </option>
        ))}
      </select>
      {hasFilters && (
        <button
          type="button"
          onClick={() => startTransition(() => router.replace("/estadisticas", { scroll: false }))}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] font-semibold text-terracotta hover:bg-terracotta/8 transition-standard shrink-0"
          title="Quitar todos los filtros"
        >
          <FilterX className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Limpiar</span>
        </button>
      )}
    </div>
  );
}
