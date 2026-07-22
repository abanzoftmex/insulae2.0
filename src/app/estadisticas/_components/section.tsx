import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

/**
 * Encabezado de sección temática. El filete de color agrupa visualmente las
 * tarjetas que le siguen sin recurrir a fondos de color, que competirían con
 * las gráficas.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  accent = "#5d5b35",
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  accent?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 pt-1">
      <div className="flex gap-3 min-w-0">
        <span className="w-[3px] rounded-full shrink-0 mt-0.5 mb-1" style={{ backgroundColor: accent }} />
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-0.5" style={{ color: accent }}>
              {eyebrow}
            </p>
          )}
          <h2 className="text-[16px] font-bold text-ink leading-tight">{title}</h2>
          {description && <p className="text-[12px] text-ink-soft mt-0.5 leading-snug">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Contenedor de una gráfica: título, apoyo opcional y cuerpo. */
export function ChartCard({
  title,
  subtitle,
  hint,
  children,
  className,
  footer,
}: {
  title: string;
  subtitle?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <section
      className={cn(
        // min-w-0 evita que el contenido ancho (tablas, treemaps) estire la
        // tarjeta más allá de su columna y provoque scroll horizontal.
        "bg-card rounded-card border border-line/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 flex flex-col min-w-0 overflow-hidden",
        className,
      )}
    >
      <header className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-ink leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-soft/85 mt-0.5 leading-snug">{subtitle}</p>}
        </div>
        {hint && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/60 shrink-0 whitespace-nowrap">
            {hint}
          </span>
        )}
      </header>
      <div className="flex-1 min-w-0">{children}</div>
      {footer && <div className="mt-3 pt-3 border-t border-line text-[11px] text-ink-soft">{footer}</div>}
    </section>
  );
}

/** Dato suelto dentro de una tarjeta (sin peso de KPI principal). */
export function MiniStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-canvas-2/70 px-3 py-2.5">
      <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-soft/70">{label}</p>
      <p className="text-[18px] font-bold leading-none mt-1.5" style={{ color: accent ?? "rgba(0,0,0,0.87)" }}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-ink-soft/75 mt-1 leading-tight">{hint}</p>}
    </div>
  );
}
