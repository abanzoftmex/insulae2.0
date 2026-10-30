/**
 * Esqueleto de carga de una pantalla del portal, como los de Slack: bloques planos que laten
 * (1 → .65 → 1 en 1 s), sin barrido ni brillo. Aparece a los 400 ms: si la pantalla llega antes,
 * no parpadea nada. El shell sigue visible alrededor.
 */
export function PageSkeleton({ label = "Cargando…", rows = 5 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-[1040px] animate-appear-late">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="animate-pulse-soft">
        <div className="h-4 w-40 rounded-ctrl bg-surface-3" />
        <div className="mt-2 h-7 w-72 max-w-full rounded-ctrl bg-surface-3" />
        <div className="mt-6 h-24 rounded-panel bg-surface-3" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-[8px] bg-surface-3" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded-ctrl bg-surface-3" />
                <div className="h-3.5 w-2/3 rounded-ctrl bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
