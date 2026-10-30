/**
 * Años de un reporte como botones segmentados, con el elegido en olivo. Con un solo año no se pinta
 * nada: no hay qué elegir. Lo usan el Resumen financiero y el Estado de resultados.
 */
import { cn } from "@/shared/utils/cn";

export function YearButtons({
  years,
  value,
  onChange,
  className,
}: {
  years: number[];
  value: number;
  onChange: (year: number) => void;
  className?: string;
}) {
  if (years.length <= 1) return null;
  return (
    <div role="group" aria-label="Año" className={cn("flex gap-1", className)}>
      {years.map((year) => (
        <button
          key={year}
          type="button"
          onClick={() => onChange(year)}
          aria-pressed={value === year}
          className={cn(
            "inline-flex h-7 items-center rounded-ctrl px-2.5 text-[13px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-brand",
            value === year ? "bg-brand text-white" : "text-fg-2 hover:bg-surface-3",
          )}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
