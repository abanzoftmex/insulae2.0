/** Esqueleto con la forma del Panel de Control: el encabezado y las tres tarjetas. */
export default function DashboardLoading() {
  return (
    <div className="animate-appear-late space-y-6" role="status" aria-label="Cargando el panel">
      <div className="h-[212px] animate-pulse-soft rounded-2xl bg-brand-deep/90" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[420px] animate-pulse-soft rounded-2xl border border-stroke-2 bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
