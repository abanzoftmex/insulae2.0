/**
 * Esqueletos de los reportes (antes `components/SkeletonLoaders.js`: tarjetas con sombra y barras
 * verdes, rojas y azules). El reporte completo usa el esqueleto de pantalla del portal; las tablas,
 * filas planas que laten como las de Slack.
 */
import { PageSkeleton } from "./page-skeleton";

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  // Tantas columnas como pide la tabla (antes eran 6 fijas y las demás bajaban de renglón).
  const columnas = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div aria-hidden className="animate-pulse-soft">
        <div className="grid gap-4 border-b border-stroke-2 px-4 py-3" style={columnas}>
          {Array.from({ length: cols }, (_, i) => (
            <div key={i} className="h-3.5 rounded-ctrl bg-surface-4" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="grid gap-4 border-b border-stroke-3 px-4 py-3.5" style={columnas}>
            {Array.from({ length: cols }, (_, c) => (
              <div key={c} className={`h-3.5 rounded-ctrl ${c === 0 ? "bg-surface-4" : "bg-surface-3"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinancialReportSkeleton() {
  return <PageSkeleton label="Cargando el reporte…" />;
}
