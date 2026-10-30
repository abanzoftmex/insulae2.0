import type { ReactNode } from "react";
import { Filter } from "lucide-react";
import { cn } from "@/shared/utils/cn";

/**
 * Piezas de cromo compartidas por los reportes de cuotas (antes
 * `components/reports/ReportChrome.js` del minisitio), calcadas del reporte de cuotas del panel.
 */

/** Encabezado de página: badge de regreso + título olivo + subtítulo + acciones */
export function ReportHeader({
  backSlot,
  title,
  subtitle,
  actions,
  className,
}: {
  backSlot?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-stroke-2",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {backSlot}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* h2: el h1 de la pantalla es el título del encabezado del portal. */}
          <h2 className="text-[26px] font-bold leading-8 tracking-[-0.02em] text-fg">{title}</h2>
          {subtitle && <p className="text-[13.5px] leading-5 text-fg-3">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Tarjeta KPI blanca sobre pergamino, con cuadro de icono a la derecha */
/**
 * Tarjeta de una cifra: etiqueta e ícono arriba, la cifra abajo a todo el ancho. La cifra se
 * ajusta al ancho de SU tarjeta (unidades de contenedor): en seis columnas un importe de ocho
 * cifras no cabía y se metía debajo del ícono.
 */
export function KpiCard({
  label,
  value,
  icon,
  iconClassName = "bg-brand/[0.08] text-brand",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("@container flex flex-col justify-between gap-2 rounded-2xl border border-stroke-2 bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[12.5px] font-medium leading-[18px] text-fg-3">{label}</p>
        {icon && (
          <div className={cn("-mr-0.5 -mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]", iconClassName)}>{icon}</div>
        )}
      </div>
      <p className="truncate text-[length:clamp(17px,11.5cqi,24px)] font-bold leading-8 tracking-[-0.02em] text-fg tabular-nums">{value}</p>
    </div>
  );
}

/** Tarjeta KPI ancha usada para la simbología P/C */
export function LegendCard({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border border-stroke-2 bg-card p-4",
        className
      )}
    >
      <div>
        <p className="text-[12.5px] font-medium text-fg-3">{label}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>
      </div>
    </div>
  );
}

const LEGEND_TONES = {
  owner: "bg-surface-3 border-stroke-2 text-fg-2",
  commerce: "bg-[#fdf6fa] border-[#f5e0eb] text-[#8f1a3d]",
  ok: "bg-success-bg border-success/20 text-success",
  warn: "bg-warning-bg border-brand-accent/30 text-warning",
  late: "bg-critical-bg border-overdue/20 text-overdue",
};

/** Pastilla de leyenda (P: Propietario / C: Comercio y estados de vencimiento) */
export function LegendPill({
  tone = "owner",
  children,
}: {
  tone?: keyof typeof LEGEND_TONES;
  children?: ReactNode;
}) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2.5 text-[12px] font-medium", LEGEND_TONES[tone] ?? LEGEND_TONES.owner)}>
      {children}
    </span>
  );
}

/** Panel blanco con franja olivo superior (barra de filtros) */
export function FilterPanel({
  title = "Filtros de búsqueda",
  children,
  className,
}: {
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-stroke-2 bg-card", className)}>
      {/* Cabecera clara: antes era una banda olivo con MAYÚSCULAS. */}
      <div className="flex items-center gap-2 border-b border-stroke-3 px-4 py-3">
        <Filter aria-hidden className="h-4 w-4 text-brand" strokeWidth={2} />
        <p className="text-[13.5px] font-semibold text-fg">{title}</p>
      </div>
      {children}
    </div>
  );
}

/** Etiqueta de campo dentro de la barra de filtros */
export function FieldLabel({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-[12.5px] font-semibold leading-4 text-fg-2",
        className
      )}
    >
      {children}
    </label>
  );
}

/**
 * Contenedor a sangre de la tabla extensiva: bordes pergamino arriba/abajo,
 * sombra profunda, márgenes negativos para romper el padding del layout.
 */
export function WideTableSection({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        // A sangre del contenido: los márgenes negativos son exactamente el relleno del <main>
        // (p-4 sm:p-6 lg:p-8). Antes llegaban a -40 px en escritorio y la tabla se salía.
        "isolate overflow-hidden border-t border-b border-stroke-2 bg-card -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8 rounded-none",
        className
      )}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .fap-inventory-table td {
            border-top: 1px solid var(--color-stroke-3) !important;
          }
          .fap-block-start td {
            border-top: 2px solid rgb(93 91 53 / 0.35) !important;
          }
          .fap-block-end td {
            border-bottom: 2px solid rgb(93 91 53 / 0.35) !important;
          }
        `,
        }}
      />
      <div className="scrollbar-slim max-h-[75vh] overflow-auto">{children}</div>
    </section>
  );
}

/** Pie de la tabla extensiva */
export function ReportFootnote({ children }: { children?: ReactNode }) {
  return (
    <div className="flex justify-between items-center py-4 px-2">
      <p className="text-[12.5px] text-fg-3">{children}</p>
    </div>
  );
}
