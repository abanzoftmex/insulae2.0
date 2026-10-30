/**
 * Cifras de resumen en una sola tarjeta, separadas por líneas finas (gap de 1 px sobre el color
 * del borde: sirve con cualquier número de columnas). En el celular, una cifra por renglón (con un
 * número impar, la primera arriba y grande); desde tablet, tres por fila, y con cuatro, en pares
 * que en pantallas anchas (xl) van en una sola fila. Con seis, dos filas de tres.
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
  // Con la barra lateral, el contenido mide 704 px a 1024: los tamaños grandes esperan a xl.
  const columnas = items.length >= 5 || items.length === 3 ? "sm:grid-cols-3" : cuatro ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2";
  return (
    <section aria-label={label} className="overflow-hidden rounded-panel border border-stroke-2">
      {/* En el celular, una cifra por renglón (etiqueta a la izquierda, monto a la derecha): en dos
          columnas, "-$10,841,545.12" no cabía. La destacada va arriba, grande. */}
      <dl className={`grid grid-cols-1 gap-px bg-stroke-3 ${columnas}`}>
        {items.map((item, index) => {
          const destacada = !cuatro && index === 0 && items.length % 2 === 1;
          const tamaño = cuatro
            ? "text-body-lg sm:text-subtitle xl:text-title"
            : destacada
              ? "text-display sm:text-subtitle xl:text-display"
              : "text-body-lg sm:text-subtitle xl:text-display";
          return (
            <div
              key={item.id}
              className={`bg-surface px-4 sm:block sm:px-5 sm:py-4 ${destacada ? "py-4" : "flex items-baseline justify-between gap-4 py-3"}`}
            >
              <dt className={`flex items-center gap-1.5 text-body font-semibold ${item.tone ? TONE[item.tone] : "text-fg-3"}`}>
                {item.label}
                {item.addon}
              </dt>
              <dd className={`font-bold text-fg tabular-nums sm:mt-0.5 ${destacada ? "mt-0.5" : ""} ${tamaño}`}>{item.value}</dd>
            </div>
          );
        })}
      </dl>
      {footer && <div className="border-t border-stroke-3 px-5 py-3 text-body text-fg-2">{footer}</div>}
    </section>
  );
}
