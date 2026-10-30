import { cn } from "@/shared/utils/cn";

/**
 * Celda financiera P/C de los reportes de cuotas (propietario y, si aplica, comercio). El monto
 * lleva el color de su estado (teja vencido, dorado por vencer, verde al corriente) sobre un
 * fondo neutro; los ceros van atenuados. Antes eran cajas rosas, ámbar y verdes.
 *
 * `statusColor` es opcional: "green" | "red" | "yellow".
 */
export type StatusColor = "green" | "red" | "yellow";

const esCeroOAtenuado = (amount: string) => {
  const clean = String(amount ?? "").trim();
  if (clean.startsWith("-")) return true;
  return !/[1-9]/.test(clean);
};

const COLOR: Record<StatusColor, string> = {
  red: "font-semibold text-overdue",
  yellow: "font-semibold text-warning",
  green: "font-semibold text-success",
};

function Fila({ etiqueta, monto, statusColor }: { etiqueta: string; monto: string; statusColor?: StatusColor }) {
  const valor = esCeroOAtenuado(monto) ? "text-fg-4" : statusColor ? COLOR[statusColor] : "font-semibold text-fg";
  return (
    <div className="flex items-center justify-between gap-1.5 rounded-ctrl bg-surface-2 px-1.5 py-0.5">
      <span className="shrink-0 text-[10px] font-semibold text-fg-3" title={etiqueta === "P" ? "Propietario" : "Comercio"}>
        {etiqueta}
      </span>
      <span className={cn("truncate text-[12px] tabular-nums", valor)}>{monto}</span>
    </div>
  );
}

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
  return (
    <div className="space-y-0.5">
      <Fila etiqueta="P" monto={owner} statusColor={statusColor} />
      {hasCommerce && <Fila etiqueta="C" monto={commerce} statusColor={statusColor} />}
    </div>
  );
}

/** Estado del área en los reportes: texto con su color (sin pastilla). */
export function AreaStatusBadge({ label, css = "" }: { label?: string; css?: string }) {
  const texto = String(label ?? "");
  const inactivo =
    texto.toUpperCase().includes("INACTIVO") || css.includes("unassigned") || css.includes("delinquent") || css.includes("yellow") || css.includes("red");
  return (
    <span className={cn("mt-0.5 inline-block text-caption font-medium", inactivo ? "text-overdue" : "text-success")}>
      {texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()}
    </span>
  );
}

/** Estado de vencimiento del minisitio. */
export type VencimientoStatus = "normal" | "vencido-naranja" | "vencido-rojo" | "sin-deuda";

/** Traduce el estado de vencimiento al color de la celda. */
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
