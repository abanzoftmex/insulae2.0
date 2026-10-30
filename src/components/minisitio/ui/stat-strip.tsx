/**
 * Cifras de resumen en una sola tarjeta, separadas por líneas finas (gap de 1 px sobre el color
 * del borde: sirve con cualquier número de columnas). Se acomodan al ancho de la propia tarjeta
 * (container queries), no al de la ventana: con la barra lateral o la vista secundaria abiertas el
 * contenido se angosta y los montos de ocho cifras se cortaban. Angostas, una cifra por renglón
 * (con un número impar, la primera arriba y grande); con espacio, en columnas.
 */
export interface StatItem {
  id: string;
  label: string;
  value: React.ReactNode;
  /** Color de la etiqueta cuando la cifra significa algo (vencido, a favor). */
  tone?: "overdue" | "success";
  /** Junto a la etiqueta (p. ej. un botón de ayuda). */
  addon?: React.ReactNode;
}

const TONE = { overdue: "text-overdue", success: "text-success" } as const;

/**
 * Por número de cifras: desde qué ancho de tarjeta van en columnas y a qué tamaño. Medido con
 * "-$10,841,545.12": a 20 px necesita ~160 px más el padding; a 28 px, ~220.
 */
const DISPOSICION = {
  2: { grid: "@md:grid-cols-2", item: "@md:block @md:px-5 @md:py-4", dd: "@md:mt-0.5", tamaño: "text-body-lg @md:text-subtitle @2xl:text-display" },
  3: { grid: "@2xl:grid-cols-3", item: "@2xl:block @2xl:px-5 @2xl:py-4", dd: "@2xl:mt-0.5", tamaño: "text-body-lg @2xl:text-subtitle @4xl:text-display" },
  4: { grid: "@lg:grid-cols-2 @[58rem]:grid-cols-4", item: "@lg:block @lg:px-5 @lg:py-4", dd: "@lg:mt-0.5", tamaño: "text-body-lg @lg:text-subtitle @[58rem]:text-title" },
  muchas: { grid: "@2xl:grid-cols-3", item: "@2xl:block @2xl:px-5 @2xl:py-4", dd: "@2xl:mt-0.5", tamaño: "text-body-lg @2xl:text-subtitle @4xl:text-title" },
} as const;
/** La destacada (impar, en un renglón propio) va grande; en columnas, como las demás. */
const DESTACADA = { 1: "text-display", 3: "text-display @2xl:text-subtitle @4xl:text-display" } as const;

export function StatStrip({ label, items, footer }: { label: string; items: StatItem[]; footer?: React.ReactNode }) {
  const n = items.length;
  const d = n >= 5 ? DISPOSICION.muchas : n === 4 ? DISPOSICION[4] : n === 3 ? DISPOSICION[3] : DISPOSICION[2];
  return (
    <section aria-label={label} className="@container overflow-hidden rounded-panel border border-stroke-2">
      <dl className={`grid grid-cols-1 gap-px bg-stroke-3 ${d.grid}`}>
        {items.map((item, index) => {
          const destacada = (n === 1 || n === 3) && index === 0;
          return (
            <div
              key={item.id}
              className={`bg-surface px-4 ${d.item} ${destacada ? "py-4" : "flex items-baseline justify-between gap-4 py-3"}`}
            >
              <dt className={`flex items-center gap-1.5 text-body font-semibold ${item.tone ? TONE[item.tone] : "text-fg-3"}`}>
                {item.label}
                {item.addon}
              </dt>
              <dd className={`font-bold text-fg tabular-nums ${d.dd} ${destacada ? `mt-0.5 ${DESTACADA[n as 1 | 3]}` : d.tamaño}`}>{item.value}</dd>
            </div>
          );
        })}
      </dl>
      {footer && <div className="border-t border-stroke-3 px-5 py-3 text-body text-fg-2">{footer}</div>}
    </section>
  );
}
