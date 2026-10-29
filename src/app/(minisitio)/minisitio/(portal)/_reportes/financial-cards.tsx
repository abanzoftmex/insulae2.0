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
          bgClass: "bg-[#faf6f0] border-[#c8b8a0]/30",
          labelClass: "text-[#7a5e44]/60",
          valueClass: "text-[#5a4838] font-medium",
        }
      : {
          bgClass: "bg-[#fdf6fa] border-[#f5e0eb]",
          labelClass: "text-[#8f1a3d]/60",
          valueClass: "text-[#35202a] font-medium",
        };
  }

  if (statusColor === "red") {
    return {
      bgClass: "bg-rose-50 border-rose-200",
      labelClass: "text-rose-600/70",
      valueClass: "text-[#dc2626] font-bold",
    };
  }
  if (statusColor === "yellow") {
    return {
      bgClass: "bg-amber-50 border-amber-200",
      labelClass: "text-amber-600/70",
      valueClass: "text-[#d97706] font-bold",
    };
  }
  if (statusColor === "green") {
    return {
      bgClass: "bg-emerald-50 border-emerald-200",
      labelClass: "text-emerald-700/70",
      valueClass: "text-[#16a34a] font-bold",
    };
  }

  if (isOwner) {
    return {
      bgClass: "bg-[#fdfbf7] border-[#c8b8a0]/40",
      labelClass: "text-[#7a5e44]",
      valueClass: "text-[#2b1e12] font-bold",
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
          "flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded border transition-colors",
          ownerStyle.bgClass
        )}
      >
        <span className={cn("text-[8px] font-bold shrink-0", ownerStyle.labelClass)}>P</span>
        <span className={cn("text-[11px] tabular-nums truncate", ownerStyle.valueClass)}>{owner}</span>
      </div>
      {hasCommerce && (
        <div
          className={cn(
            "flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded border transition-colors",
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
        "px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase border inline-block mt-0.5",
        isInactive
          ? "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]"
          : "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]"
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
