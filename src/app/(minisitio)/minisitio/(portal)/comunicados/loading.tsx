/** Esqueleto con la forma de Comunicados: encabezado, filtros y tarjetas. */
export default function ComunicadosLoading() {
  return (
    <div className="animate-appear-late space-y-6" role="status" aria-label="Cargando comunicados">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 animate-pulse-soft rounded-2xl bg-surface-4" />
        <div className="space-y-2">
          <div className="h-6 w-44 animate-pulse-soft rounded-md bg-surface-4" />
          <div className="h-4 w-80 animate-pulse-soft rounded-md bg-surface-3" />
        </div>
      </div>
      <div className="h-[104px] animate-pulse-soft rounded-2xl border border-stroke-2 bg-surface-2" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[180px] animate-pulse-soft rounded-2xl border border-stroke-2 bg-surface-2" />
      ))}
    </div>
  );
}
