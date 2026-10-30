/** Insignia de estado de pago. Colores del portal: teja = vencido, verde = al día, dorado = pendiente. */
export function StatusBadge({ status, type = "payment" }: { status: number | string | null | undefined; type?: string }) {
  const getStatusConfig = () => {
    if (type === "payment") {
      switch (status) {
        case 1: // Al día
          return { color: "bg-success-bg text-success ring-success/15", dot: "bg-success", text: "Al día" };
        case 3: // Vencido
          return { color: "bg-critical-bg text-overdue ring-overdue/15", dot: "bg-overdue", text: "Vencido" };
        case 2: // En proceso
          return { color: "bg-warning-bg text-warning ring-brand-accent/25", dot: "bg-brand-accent", text: "Pendiente" };
        default:
          return { color: "bg-surface-4 text-fg-3 ring-stroke-2", dot: "bg-fg-4", text: "Sin estado" };
      }
    }

    // Para otros tipos de status
    return { color: "bg-surface-4 text-fg-2 ring-stroke-2", dot: "bg-fg-4", text: status };
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ring-1 ring-inset ${config.color}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.text}
    </span>
  );
}

export default StatusBadge;
