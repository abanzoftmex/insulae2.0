"use client";

/**
 * Piezas de los dos estados de cuenta (propiedad y comercio): secciones, datos, resumen,
 * tabla de movimientos, últimos pagos y barra de acciones. La distribución es la aprobada; aquí
 * vive la ejecución para que ambas pantallas midan y se lean igual.
 */
import Link from "next/link";
import { ArrowLeft, Download, LifeBuoy, List, Loader2, Mail } from "lucide-react";
import { StatusBadge } from "@/components/minisitio/status-badge";
import { BUTTON } from "@/components/minisitio/ui/list-controls";
import { formatCurrency, formatDate, movementBadgeStatus, movementBalance, sancionArticulo } from "../../_lib/estado-cuenta-utils";

export function StatementSection({
  title,
  description,
  action,
  flush = false,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Sin relleno interior (tablas a sangre). */
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke-3 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold leading-6 text-fg">{title}</h2>
          {description && <p className="text-[13px] leading-5 text-fg-3">{description}</p>}
        </div>
        {action}
      </div>
      <div className={flush ? "" : "px-5 py-5 sm:px-6"}>{children}</div>
    </section>
  );
}

export function InfoGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[12px] font-medium text-fg-3">{item.label}</dt>
          <dd className="mt-0.5 truncate text-[14px] font-medium leading-5 text-fg tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type SummaryTone = "neutral" | "success" | "overdue" | "discount";

const SUMMARY_TONE: Record<SummaryTone, { bar: string; value: string }> = {
  neutral: { bar: "bg-brand", value: "text-fg" },
  success: { bar: "bg-success", value: "text-success" },
  overdue: { bar: "bg-overdue", value: "text-overdue" },
  discount: { bar: "bg-brand-accent", value: "text-warning" },
};

/** Cifra del resumen con su barra de color a la izquierda (el acento contable del diseño). */
export function SummaryStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: SummaryTone }) {
  const t = SUMMARY_TONE[tone];
  return (
    <div className="relative pl-4">
      <span aria-hidden className={`absolute inset-y-0.5 left-0 w-[3px] rounded-full ${t.bar}`} />
      <dt className="text-[12.5px] font-medium text-fg-3">{label}</dt>
      <dd className={`mt-1 text-[26px] font-bold leading-8 tracking-[-0.02em] tabular-nums ${t.value}`}>{value}</dd>
    </div>
  );
}

export interface StatementMovement {
  grupoCobro?: string | null;
  concepto?: string | null;
  fechaPago?: string | null;
  fechaVigencia?: string | null;
  fechaLiquidacion?: string | null;
  monto: unknown;
  montoAbonado: unknown;
  intereses: unknown;
  descuento_aplicado: unknown;
  id_cat_status_pago?: number | null;
  sancionInfo?: unknown;
}

// Los encabezados largos ("Fecha Límite de Pago", "Intereses Moratorios") pueden ir en dos
// líneas: así la columna mide lo que su dato y la tabla completa cabe en 1440 px.
const TH = "border-b border-stroke-2 bg-surface-2 px-3 py-2.5 align-bottom text-[12px] font-semibold leading-4 text-fg-3 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6";
const TD = "border-b border-stroke-3 px-3 py-3 text-[13px] text-fg tabular-nums first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6";

/** Tabla de cargos y movimientos. Cada cifra con su color solo si significa algo. */
export function MovementsTable({
  movimientos,
  defaultGroup,
  unpaidLabel = "N/A",
}: {
  movimientos: StatementMovement[];
  /** Tipo de cuota cuando el movimiento no trae grupo. */
  defaultGroup: string;
  /** Texto de "Pagado el" cuando aún no se liquida. */
  unpaidLabel?: string;
}) {
  return (
    <div className="scrollbar-slim overflow-x-auto">
      <table className="w-full min-w-[960px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th scope="col" className={`${TH} text-left`}>Tipo de Cuota</th>
            <th scope="col" className={`${TH} text-left`}>Concepto</th>
            <th scope="col" className={`${TH} text-left`}>Fecha de Cobro</th>
            <th scope="col" className={`${TH} text-left`}>Fecha Límite de Pago</th>
            <th scope="col" className={`${TH} text-left`}>Pagado el</th>
            <th scope="col" className={`${TH} text-right`}>Cargo</th>
            <th scope="col" className={`${TH} text-right`}>Abono</th>
            <th scope="col" className={`${TH} text-right`}>Intereses Moratorios</th>
            <th scope="col" className={`${TH} text-right`}>Descuento</th>
            <th scope="col" className={`${TH} text-right`}>Saldo</th>
            <th scope="col" className={`${TH} text-center`}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((movimiento, index) => {
            const articulo = sancionArticulo(movimiento);
            // Positivo = deuda; solo se muestra deuda, no saldos a favor.
            const saldoBruto = movementBalance(movimiento);
            const saldo = saldoBruto > 0 ? saldoBruto : 0;
            const abono = parseFloat(String(movimiento.montoAbonado)) || 0;
            const intereses = parseFloat(String(movimiento.intereses)) || 0;
            const descuento = parseFloat(String(movimiento.descuento_aplicado)) || 0;
            return (
              <tr key={index} className="transition-colors duration-100 hover:bg-surface-3">
                {/* Tipo y concepto pueden ocupar dos líneas: así la tabla cabe sin desplazarse en 1440 px. */}
                <td className={`${TD} min-w-[120px] max-w-[180px] text-fg-2`}>{movimiento.grupoCobro || defaultGroup}</td>
                <td className={`${TD} min-w-[130px] max-w-[220px]`}>
                  <div className="line-clamp-2" title={movimiento.concepto || undefined}>
                    {movimiento.concepto || "Sin concepto"}
                  </div>
                  {articulo && <div className="mt-0.5 text-[12px] text-overdue">{articulo}</div>}
                </td>
                <td className={`${TD} whitespace-nowrap`}>{formatDate(movimiento.fechaPago)}</td>
                <td className={`${TD} whitespace-nowrap`}>{formatDate(movimiento.fechaVigencia)}</td>
                <td className={`${TD} whitespace-nowrap ${movimiento.fechaLiquidacion ? "" : "text-fg-4"}`}>
                  {movimiento.fechaLiquidacion ? formatDate(movimiento.fechaLiquidacion) : unpaidLabel}
                </td>
                <td className={`${TD} whitespace-nowrap text-right`}>{formatCurrency(movimiento.monto)}</td>
                <td className={`${TD} whitespace-nowrap text-right ${abono > 0 ? "text-success" : "text-fg-4"}`}>
                  {formatCurrency(movimiento.montoAbonado)}
                </td>
                <td className={`${TD} whitespace-nowrap text-right ${intereses > 0 ? "text-warning" : "text-fg-4"}`}>
                  {formatCurrency(movimiento.intereses)}
                </td>
                <td className={`${TD} whitespace-nowrap text-right ${descuento > 0 ? "text-warning" : "text-fg-4"}`}>
                  {formatCurrency(movimiento.descuento_aplicado || 0)}
                </td>
                <td className={`${TD} whitespace-nowrap text-right font-semibold ${saldo > 0 ? "text-overdue" : "text-fg-4"}`}>
                  {formatCurrency(saldo)}
                </td>
                <td className={`${TD} whitespace-nowrap text-center`}>
                  <StatusBadge status={movementBadgeStatus(movimiento.id_cat_status_pago)} type="payment" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PaymentsTable({ pagos }: { pagos: { folio?: string | null; fecha?: string | null; monto: unknown }[] }) {
  return (
    <div className="scrollbar-slim overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th scope="col" className={`${TH} w-1/3 text-left`}>Folio</th>
            <th scope="col" className={`${TH} w-1/3 text-left`}>Fecha de Pago</th>
            <th scope="col" className={`${TH} w-1/3 text-right`}>Abono Realizado</th>
          </tr>
        </thead>
        <tbody>
          {pagos.map((pago, index) => (
            <tr key={index} className="transition-colors duration-100 hover:bg-surface-3">
              <td className={`${TD} whitespace-nowrap font-medium`}>{pago.folio || "N/A"}</td>
              <td className={`${TD} whitespace-nowrap`}>{formatDate(pago.fecha)}</td>
              <td className={`${TD} whitespace-nowrap text-right font-semibold text-success`}>{formatCurrency(pago.monto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Acciones del estado de cuenta, en el orden aprobado: volver, listado, descargar, ayuda, correo. */
export function StatementActions({
  backHref,
  listHref,
  listLabel,
  onDownload,
  downloading,
  downloadDisabled = false,
  onHelp,
  onEmail,
  sending,
  emailDisabled = false,
}: {
  backHref: string;
  listHref: string;
  listLabel: string;
  onDownload: () => void;
  downloading: boolean;
  downloadDisabled?: boolean;
  onHelp: () => void;
  onEmail: () => void;
  sending: boolean;
  emailDisabled?: boolean;
}) {
  return (
    <StatementSection title="Acciones">
      <div className="flex flex-wrap gap-2.5">
        <Link href={backHref} className={`group ${BUTTON.secondary}`}>
          <ArrowLeft aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2} />
          Volver al Detalle
        </Link>
        <Link href={listHref} className={BUTTON.secondary}>
          <List aria-hidden className="h-4 w-4" strokeWidth={2} />
          {listLabel}
        </Link>
        <button type="button" className={BUTTON.secondary} onClick={onDownload} disabled={downloading || downloadDisabled}>
          {downloading ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <Download aria-hidden className="h-4 w-4" strokeWidth={2} />
          )}
          {downloading ? "Generando PDF…" : "Descargar Estado de Cuenta"}
        </button>
        <button
          type="button"
          onClick={onHelp}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-warning px-4 text-[13.5px] font-semibold text-white outline-none transition-colors duration-150 hover:bg-[#755720] focus-visible:ring-2 focus-visible:ring-brand-accent/50 focus-visible:ring-offset-2"
        >
          <LifeBuoy aria-hidden className="h-4 w-4" strokeWidth={2} />
          Solicitar ayuda
        </button>
        <button type="button" className={BUTTON.primary} onClick={onEmail} disabled={sending || emailDisabled}>
          {sending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <Mail aria-hidden className="h-4 w-4" strokeWidth={2} />
          )}
          {sending ? "Enviando…" : "Enviar por Email"}
        </button>
      </div>
    </StatementSection>
  );
}
