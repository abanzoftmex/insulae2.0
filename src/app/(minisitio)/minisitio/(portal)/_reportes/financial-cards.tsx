import { cn } from "@/shared/utils/cn";

/**
 * Tarjetas P/C de la celda financiera (antes `components/reports/FinancialCards.js` del
 * minisitio). Puerto exacto de `renderFinancialCards` de los reportes de cuotas del panel.
 *
 * `statusColor` es opcional: "green" | "red" | "yellow". El minisitio lo usa para reflejar
 * el estado de vencimiento sobre la misma paleta del admin.
 */
export type StatusColor = "green" | "red" | "yellow";

const isZeroOrMuted = (amount: string) => {
  const clean = String(amount ?? "").trim();
  if (clean.startsWith("-")) return true;
  const hasNonZeroDigits = /[1-9]/.test(clean);
  return !hasNonZeroDigits;
};

const getCardStyle = (amount: string, isOwner: boolean, statusColor?: StatusColor) => {
  if (isZeroOrMuted(amount)) {
    return isOwner
      ? {
          bgClass: "bg-surface-2 border-stroke-3",
          labelClass: "text-fg-4",
          valueClass: "text-fg-4 font-medium",
        }
      : {
          bgClass: "bg-[#fdf6fa] border-[#f5e0eb]",
          labelClass: "text-[#8f1a3d]/50",
          valueClass: "text-fg-4 font-medium",
        };
  }

  if (statusColor === "red") {
    return {
      bgClass: "bg-critical-bg border-overdue/20",
      labelClass: "text-overdue/70",
      valueClass: "text-overdue font-semibold",
    };
  }
  if (statusColor === "yellow") {
    return {
      bgClass: "bg-warning-bg border-brand-accent/30",
      labelClass: "text-warning/70",
      valueClass: "text-warning font-semibold",
    };
  }
  if (statusColor === "green") {
    return {
      bgClass: "bg-success-bg border-success/20",
      labelClass: "text-success/70",
      valueClass: "text-success font-semibold",
    };
  }

  if (isOwner) {
    return {
      bgClass: "bg-card border-stroke-2",
      labelClass: "text-fg-3",
      valueClass: "text-fg font-semibold",
    };
  }
  return {
    bgClass: "bg-[#fff5f7] border-[#f5c0d0]/40",
    labelClass: "text-[#8f1a3d]",
    valueClass: "text-[#501020] font-bold",
  };
};

export function FinancialCards({
  owner,
  commerce,
  hasCommerce = false,
  statusColor,
}: {
  owner: string;
  commerce: string;
  hasCommerce?: boolean;
  statusColor?: StatusColor;
}) {
  const ownerStyle = getCardStyle(owner, true, statusColor);
  const commerceStyle = getCardStyle(commerce, false, statusColor);

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-2 py-1 rounded-md border transition-colors",
          ownerStyle.bgClass
        )}
      >
        <span className={cn("text-[10px] font-bold shrink-0", ownerStyle.labelClass)}>P</span>
        <span className={cn("text-[12.5px] tabular-nums truncate", ownerStyle.valueClass)}>{owner}</span>
      </div>
      {hasCommerce && (
        <div
          className={cn(
            "flex items-center justify-between gap-2 px-2 py-1 rounded-md border transition-colors",
            commerceStyle.bgClass
          )}
        >
          <span className={cn("text-[8px] font-bold shrink-0", commerceStyle.labelClass)}>C</span>
          <span className={cn("text-[11px] tabular-nums truncate", commerceStyle.valueClass)}>{commerce}</span>
        </div>
      )}
    </div>
  );
}

/** Puerto de `StatusBadge` en las páginas de reporte de cuotas del panel. */
export function AreaStatusBadge({ label, css = "" }: { label?: string; css?: string }) {
  const isInactive =
    String(label ?? "").toUpperCase().includes("INACTIVO") ||
    css.includes("unassigned") ||
    css.includes("delinquent") ||
    css.includes("yellow") ||
    css.includes("red");

  return (
    <span
      className={cn(
        // La etiqueta llega en MAYÚSCULAS ("ACTIVO"): se muestra en tipo oración.
        "mt-1 inline-block rounded-full border px-2 py-px text-[11.5px] font-medium lowercase first-letter:uppercase",
        isInactive ? "bg-critical-bg text-overdue border-overdue/20" : "bg-success-bg text-success border-success/20"
      )}
    >
      {label}
    </span>
  );
}

/** Estado de vencimiento del minisitio. */
export type VencimientoStatus = "normal" | "vencido-naranja" | "vencido-rojo" | "sin-deuda";

/** Traduce el estado de vencimiento del minisitio al `paymentStatusColor` de la paleta del panel. */
export function toStatusColor(vencimientoStatus: VencimientoStatus): StatusColor | undefined {
  switch (vencimientoStatus) {
    case "vencido-rojo":
      return "red";
    case "vencido-naranja":
      return "yellow";
    case "sin-deuda":
      return "green";
    default:
      return undefined;
  }
}
