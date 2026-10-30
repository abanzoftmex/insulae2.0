/** Esqueleto de Experiencias: la banda y tres tarjetas del carrusel. */
export default function ExperienciasLoading() {
  return (
    <div className="animate-appear-late overflow-hidden rounded-2xl border border-stroke-2 bg-card" role="status" aria-label="Cargando experiencias">
      <div className="h-[72px] animate-pulse-soft bg-warning/80" />
      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[250px] animate-pulse-soft rounded-2xl bg-surface-3" />
        ))}
      </div>
    </div>
  );
}
