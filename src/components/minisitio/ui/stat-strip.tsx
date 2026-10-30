/**
 * Cifras de resumen en una sola tarjeta, separadas por líneas finas (gap de 1 px sobre el color
 * del borde: sirve con cualquier número de columnas). Con tres cifras, la primera ocupa el ancho
 * en el celular; con cuatro, van en pares; con seis, en dos filas de tres.
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

export function StatStrip({ label, items, footer }: { label: string; items: StatItem[]; footer?: React.ReactNode }) {
  const cuatro = items.length >= 4;
  // Con seis, dos filas de tres: en una sola fila los montos de ocho cifras no caben.
  const columnas = items.length >= 5 ? "sm:grid-cols-3" : cuatro ? "lg:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <section aria-label={label} className="overflow-hidden rounded-panel border border-stroke-2">
      <dl className={`grid grid-cols-2 gap-px bg-stroke-3 ${columnas}`}>
        {items.map((item, index) => {
          const destacada = !cuatro && index === 0 && items.length % 2 === 1;
          const tamaño = cuatro ? "text-subtitle sm:text-title" : destacada ? "text-display" : "text-subtitle sm:text-display";
          return (
            <div key={item.id} className={`bg-surface px-5 py-4 ${destacada ? "col-span-2 sm:col-span-1" : ""}`}>
              <dt className={`flex items-center gap-1.5 text-body font-semibold ${item.tone ? TONE[item.tone] : "text-fg-3"}`}>
                {item.label}
                {item.addon}
              </dt>
              <dd className={`mt-0.5 font-bold text-fg tabular-nums ${tamaño}`}>{item.value}</dd>
            </div>
          );
        })}
      </dl>
      {footer && <div className="border-t border-stroke-3 px-5 py-3 text-body text-fg-2">{footer}</div>}
    </section>
  );
}
