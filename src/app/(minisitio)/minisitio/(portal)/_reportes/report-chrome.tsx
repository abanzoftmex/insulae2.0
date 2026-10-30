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
        "flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#4c4a24]/20",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {backSlot}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-[#4c4a24] tracking-tighter uppercase">{title}</h1>
          {subtitle && (
            <p className="text-[#7a5e44] text-[11px] font-bold uppercase tracking-tight">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Tarjeta KPI blanca sobre pergamino, con cuadro de icono a la derecha */
export function KpiCard({
  label,
  value,
  icon,
  iconClassName = "bg-[#4c4a24]",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-white border border-[#c8b8a0]/40 shadow-xs flex items-center justify-between",
        className
      )}
    >
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#7a5e44]">{label}</p>
        <p className="text-2xl font-bold text-[#2b1e12] tabular-nums mt-0.5">{value}</p>
      </div>
      {icon && (
        <div className={cn("h-9 w-9 rounded-lg text-white flex items-center justify-center", iconClassName)}>
          {icon}
        </div>
      )}
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
        "p-4 rounded-xl bg-white border border-[#c8b8a0]/40 shadow-xs flex items-center justify-between",
        className
      )}
    >
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#7a5e44]">{label}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">{children}</div>
      </div>
    </div>
  );
}

const LEGEND_TONES = {
  owner: "bg-[#faf6f0] border-[#c8b8a0]/40 text-[#7a5e44]",
  commerce: "bg-[#fdf6fa] border-[#f5e0eb] text-[#8f1a3d]",
  ok: "bg-emerald-50 border-emerald-200 text-emerald-700",
  warn: "bg-amber-50 border-amber-200 text-amber-700",
  late: "bg-rose-50 border-rose-200 text-rose-700",
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
    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", LEGEND_TONES[tone] ?? LEGEND_TONES.owner)}>
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
    <div className={cn("overflow-hidden rounded-card border border-[#c8b8a0]/40 bg-white shadow-sm", className)}>
      <div className="px-4 py-2.5 bg-[#4c4a24] text-white flex items-center gap-2 rounded-t-card">
        <Filter className="h-3.5 w-3.5 text-white/80" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-white">{title}</p>
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
        "text-[10px] font-bold uppercase tracking-widest text-[#7a5e44] leading-none mb-1.5 block",
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
        "overflow-hidden border-t border-b border-[#c8b59d]/50 bg-white/88 shadow-[0_14px_36px_rgba(30,18,8,0.10)] backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-10 -mb-4 md:-mb-6 lg:-mb-8 rounded-none",
        className
      )}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .fap-inventory-table td {
            border-top: 1px solid #e5d8c8 !important;
          }
          .fap-block-start td {
            border-top: 2.5px solid #a89678 !important;
          }
          .fap-block-end td {
            border-bottom: 2.5px solid #a89678 !important;
          }
        `,
        }}
      />
      <div className="overflow-auto max-h-[75vh]">{children}</div>
    </section>
  );
}

/** Pie de la tabla extensiva */
export function ReportFootnote({ children }: { children?: ReactNode }) {
  return (
    <div className="flex justify-between items-center py-4 px-2">
      <p className="text-[11px] font-bold text-[#7a5e44] uppercase tracking-widest">{children}</p>
    </div>
  );
}
