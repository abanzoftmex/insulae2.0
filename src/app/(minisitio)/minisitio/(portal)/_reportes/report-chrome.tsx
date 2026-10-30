import type { ReactNode } from "react";
import { Filter } from "lucide-react";
import { cn } from "@/shared/utils/cn";

/**
 * Piezas compartidas por los reportes del condominio, con el lenguaje del portal
 * (docs/minisitio-design-system.md): mayúsculas solo al inicio, cifras en tinta con
 * `tabular-nums`, tarjetas con borde y sin sombra, y el color solo cuando significa algo.
 * Antes eran un calco del pergamino del panel (bandas olivo, MAYÚSCULAS con tracking y chips de
 * ícono); la API se conserva para no tocar cada reporte.
 */

/** Encabezado del reporte: título, contexto y acciones. El regreso ya lo dan el historial y las migas del shell. */
export function ReportHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  /** Se ignora: el shell ya trae atrás/adelante y migas. */
  backSlot?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-4 border-b border-stroke-3 pb-4 md:flex-row md:items-end", className)}>
      <div className="min-w-0">
        <h2 className="text-title font-bold text-fg first-letter:uppercase">{title}</h2>
        {subtitle && <p className="mt-0.5 text-body text-fg-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Cifra de resumen. El ícono se acepta por compatibilidad pero no se pinta (nada de chips de ícono). */
export function KpiCard({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-panel border border-stroke-2 bg-surface px-5 py-4", className)}>
      <p className="text-body font-semibold text-fg-3">{label}</p>
      <p className="mt-0.5 text-title font-bold text-fg tabular-nums">{value}</p>
    </div>
  );
}

/** Tarjeta de simbología (P/C y estados de vencimiento). */
export function LegendCard({ label, children, className }: { label: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-panel border border-stroke-2 bg-surface px-5 py-4", className)}>
      <p className="text-body font-semibold text-fg-3">{label}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">{children}</div>
    </div>
  );
}

const LEGEND_TONES = {
  owner: "text-fg-2",
  commerce: "text-fg-2",
  ok: "text-success",
  warn: "text-warning",
  late: "text-overdue",
};

/** Leyenda: un punto del color del estado y su nombre (sin pastillas de color). */
export function LegendPill({ tone = "owner", children }: { tone?: keyof typeof LEGEND_TONES; children?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-caption font-medium", LEGEND_TONES[tone] ?? LEGEND_TONES.owner)}>
      <span aria-hidden className="h-2 w-2 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** Panel de filtros: borde fino y un título discreto (antes una banda olivo). */
export function FilterPanel({ title = "Filtros", children, className }: { title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-panel border border-stroke-2 bg-surface", className)}>
      <p className="flex items-center gap-2 border-b border-stroke-3 px-4 py-2.5 text-body font-semibold text-fg first-letter:uppercase">
        <Filter className="h-3.5 w-3.5 text-fg-3" aria-hidden />
        {title}
      </p>
      {children}
    </div>
  );
}

/** Etiqueta de campo dentro del panel de filtros. */
export function FieldLabel({ children, className }: { children?: ReactNode; className?: string }) {
  return <label className={cn("mb-1.5 block text-caption font-semibold text-fg-3", className)}>{children}</label>;
}

/**
 * Tabla extensiva a lo ancho del panel de contenido (márgenes negativos iguales a su padding),
 * con scroll propio y las líneas de bloque de las FAP en los tonos de borde del portal.
 */
export function WideTableSection({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <section className={cn("-mx-4 -mb-4 overflow-hidden border-y border-stroke-2 bg-surface sm:-mx-6 sm:-mb-6", className)}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .fap-inventory-table td { border-top: 1px solid var(--color-stroke-3) !important; }
          .fap-block-start td { border-top: 2px solid var(--color-stroke) !important; }
          .fap-block-end td { border-bottom: 2px solid var(--color-stroke) !important; }
        `,
        }}
      />
      <div className="max-h-[75vh] overflow-auto">{children}</div>
    </section>
  );
}

/** Pie de la tabla extensiva. */
export function ReportFootnote({ children }: { children?: ReactNode }) {
  return <p className="px-2 py-4 text-caption text-fg-3">{children}</p>;
}
