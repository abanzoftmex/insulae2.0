"use client";

/**
 * Piezas del estado de cuenta que comparten propiedades y comercios:
 * - el resumen, con la cuenta completa (cargos + intereses − pagos − descuentos = saldo), que
 *   explica por qué se debe más que los cargos;
 * - los movimientos, pendientes o todos, con su estado (vencido, por vencer, pagado) según la
 *   misma regla que el saldo (saldo > 0 y fecha límite pasada = vencido);
 * - los últimos pagos y la barra de acciones (PDF, correo, "¿Algo no cuadra?").
 */
import { useMemo, useState } from "react";
import { FileDown, Landmark, LifeBuoy, Mail } from "lucide-react";
import { buttonClass } from "@/components/minisitio/ui/button";
import { StatStrip } from "@/components/minisitio/ui/stat-strip";
import { UnderlineTabs } from "@/components/minisitio/ui/tabs";
import { formatCurrency, formatShortDate } from "../../_lib/format";

export interface MovimientoEstadoCuenta {
  concepto: string;
  grupoCobro?: string | null;
  /** Fecha límite de pago. */
  fechaVigencia: string | null;
  monto: number;
  montoAbonado: number;
  intereses: number;
  descuento_aplicado: number;
}

type Estado = "vencido" | "por-vencer" | "pagado";

const ESTADO: Record<Estado, { label: string; className: string }> = {
  vencido: { label: "Vencido", className: "text-overdue" },
  "por-vencer": { label: "Por vencer", className: "text-fg-2" },
  pagado: { label: "Pagado", className: "text-success" },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function conEstado(m: MovimientoEstadoCuenta, ahora: number) {
  const saldo = round2(m.monto - m.montoAbonado - m.descuento_aplicado + m.intereses);
  if (saldo <= 0) return { saldo: 0, estado: "pagado" as const };
  const vence = m.fechaVigencia ? Date.parse(m.fechaVigencia) : NaN;
  return { saldo, estado: !Number.isNaN(vence) && vence < ahora ? ("vencido" as const) : ("por-vencer" as const) };
}

export function StatementSummary({
  vencido,
  pendiente,
  aFavor,
  cargos,
  intereses,
  pagos,
  descuentos,
}: {
  vencido: number;
  pendiente: number;
  aFavor: number;
  cargos: number;
  intereses: number;
  pagos: number;
  descuentos: number;
}) {
  const saldo = round2(cargos + intereses - pagos - descuentos);
  return (
    <StatStrip
      label="Resumen del estado de cuenta"
      items={[
        { id: "vencido", label: "Saldo vencido", value: formatCurrency(vencido), tone: vencido > 0 ? "overdue" : undefined },
        { id: "por-vencer", label: "Por vencer", value: formatCurrency(Math.max(0, pendiente - vencido)) },
        { id: "a-favor", label: "A favor", value: formatCurrency(aFavor), tone: aFavor > 0 ? "success" : undefined },
      ]}
      footer={
        <p className="text-fg-3">
          Cargos <Cifra value={cargos} /> + intereses <Cifra value={intereses} /> − pagos <Cifra value={pagos} />
          {descuentos > 0 && (
            <>
              {" "}
              − descuentos <Cifra value={descuentos} />
            </>
          )}{" "}
          = {saldo >= 0 ? "saldo" : "a favor"} <Cifra value={Math.abs(saldo)} strong />
        </p>
      }
    />
  );
}

function Cifra({ value, strong = false }: { value: number; strong?: boolean }) {
  return <span className={`whitespace-nowrap tabular-nums ${strong ? "font-semibold text-fg" : "text-fg-2"}`}>{formatCurrency(value)}</span>;
}

export function StatementActions({
  onPdf,
  generating,
  onEmail,
  sending,
  onHelp,
  onPay,
  destacarPago = false,
}: {
  onPdf: () => void;
  generating: boolean;
  onEmail: () => void;
  sending: boolean;
  onHelp: () => void;
  /** Abre "Cómo pagar" (si la administración publicó cómo). */
  onPay?: () => void;
  /** Con saldo por pagar, "Cómo pagar" es la acción principal. */
  destacarPago?: boolean;
}) {
  const pagoPrincipal = Boolean(onPay) && destacarPago;
  return (
    <div className="flex flex-wrap gap-2">
      {onPay && (
        <button type="button" onClick={onPay} className={buttonClass(pagoPrincipal ? "primary" : "outline", "sm")}>
          <Landmark className="h-3.5 w-3.5" aria-hidden />
          Cómo pagar
        </button>
      )}
      <button type="button" onClick={onPdf} disabled={generating} className={buttonClass(pagoPrincipal ? "outline" : "primary", "sm")}>
        <FileDown className="h-3.5 w-3.5" aria-hidden />
        {generating ? "Generando…" : "Descargar PDF"}
      </button>
      <button type="button" onClick={onEmail} disabled={generating || sending} className={buttonClass("outline", "sm")}>
        <Mail className="h-3.5 w-3.5" aria-hidden />
        {sending ? "Enviando…" : "Enviar por correo"}
      </button>
      <button type="button" onClick={onHelp} className={buttonClass("ghost", "sm")}>
        <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
        ¿Algo no cuadra?
      </button>
    </div>
  );
}

export function StatementMovements({ movimientos, timeZone }: { movimientos: MovimientoEstadoCuenta[]; timeZone?: string }) {
  const [ahora] = useState(() => Date.now());
  const filas = useMemo(() => movimientos.map((m, index) => ({ ...m, index, ...conEstado(m, ahora) })), [movimientos, ahora]);
  const pendientes = filas.filter((f) => f.estado !== "pagado");
  const [filtro, setFiltro] = useState<"pendientes" | "todos">(pendientes.length > 0 ? "pendientes" : "todos");
  const visibles = filtro === "pendientes" ? pendientes : filas;
  const totales = visibles.reduce(
    (acc, f) => ({
      cargo: acc.cargo + f.monto,
      intereses: acc.intereses + f.intereses,
      abonado: acc.abonado + f.montoAbonado,
      descuento: acc.descuento + f.descuento_aplicado,
      saldo: acc.saldo + f.saldo,
    }),
    { cargo: 0, intereses: 0, abonado: 0, descuento: 0, saldo: 0 },
  );

  return (
    <section aria-labelledby="ec-movimientos" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-x-4 border-b border-stroke-3">
        <h2 id="ec-movimientos" className="pb-2 text-body-lg font-bold text-fg">
          Movimientos
        </h2>
        <UnderlineTabs
          label="Mostrar movimientos"
          value={filtro}
          onChange={setFiltro}
          layoutId="ec-movimientos-tab"
          options={[
            { id: "pendientes", label: "Pendientes", count: pendientes.length },
            { id: "todos", label: "Todos", count: filas.length },
          ]}
        />
      </div>

      {visibles.length === 0 ? (
        <p className="py-12 text-center text-body text-fg-2">{filtro === "pendientes" ? "No tienes cargos pendientes." : "Todavía no hay movimientos."}</p>
      ) : (
        <>
          <table className="w-full text-body max-md:hidden">
            <thead>
              <tr className="text-left text-caption text-fg-3">
                <Th>Concepto</Th>
                <Th>Vence</Th>
                <Th align="right">Cargo</Th>
                <Th align="right">Intereses</Th>
                <Th align="right">Abonado</Th>
                <Th align="right">Descuento</Th>
                <Th align="right">Saldo</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke-3">
              {visibles.map((f) => (
                <tr key={f.index} className="hover:bg-surface-2">
                  <td className="py-2.5 pr-3">
                    <span className="block text-fg">{f.concepto || "Cargo"}</span>
                    {f.grupoCobro && f.grupoCobro !== f.concepto && <span className="block text-caption text-fg-3">{f.grupoCobro}</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-fg-2" suppressHydrationWarning>
                    {formatShortDate(f.fechaVigencia, timeZone) || "—"}
                  </td>
                  <Monto value={f.monto} />
                  <Monto value={f.intereses} />
                  <Monto value={f.montoAbonado} />
                  <Monto value={f.descuento_aplicado} />
                  <td className={`px-3 py-2.5 text-right whitespace-nowrap tabular-nums ${f.estado === "vencido" ? "font-semibold text-overdue" : "text-fg"}`}>
                    {f.saldo > 0 ? formatCurrency(f.saldo) : <span className="text-fg-4">—</span>}
                  </td>
                  <td className={`py-2.5 pl-3 whitespace-nowrap ${ESTADO[f.estado].className}`}>{ESTADO[f.estado].label}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-stroke-2 font-semibold text-fg">
                <td className="py-3 pr-3" colSpan={2}>
                  Total
                </td>
                <Monto value={totales.cargo} always />
                <Monto value={totales.intereses} always />
                <Monto value={totales.abonado} always />
                <Monto value={totales.descuento} always />
                <Monto value={totales.saldo} always />
                <td />
              </tr>
            </tfoot>
          </table>

          <ul className="divide-y divide-stroke-3 md:hidden">
            {visibles.map((f) => (
              <li key={f.index} className="flex items-start gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-fg">{f.concepto || "Cargo"}</span>
                  <span className="block text-caption text-fg-3" suppressHydrationWarning>
                    Vence {formatShortDate(f.fechaVigencia, timeZone) || "—"}
                    {f.intereses > 0 && ` · incluye ${formatCurrency(f.intereses)} de intereses`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block tabular-nums ${f.estado === "vencido" ? "font-semibold text-overdue" : "text-fg"}`}>{formatCurrency(f.saldo > 0 ? f.saldo : f.monto)}</span>
                  <span className={`block text-caption ${ESTADO[f.estado].className}`}>{ESTADO[f.estado].label}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export interface PagoEstadoCuenta {
  fechaPago: string | null;
  monto: number;
  folio?: string | null;
  formaPago?: string | null;
}

/** Formas de pago del modelo (enum PaymentMethod) en palabras. */
const FORMA_PAGO: Record<string, string> = { CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", CHECK: "Cheque", OTHER: "Otro" };

export function StatementPayments({ pagos, timeZone }: { pagos: PagoEstadoCuenta[]; timeZone?: string }) {
  if (pagos.length === 0) return null;
  return (
    <section aria-labelledby="ec-pagos" className="mt-8">
      <h2 id="ec-pagos" className="border-b border-stroke-3 pb-2 text-body-lg font-bold text-fg">
        Últimos pagos
      </h2>
      <ul className="divide-y divide-stroke-3">
        {pagos.map((p, index) => (
          <li key={index} className="flex items-baseline gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-fg" suppressHydrationWarning>
                {formatShortDate(p.fechaPago, timeZone) || "Sin fecha"}
              </span>
              {(p.folio || p.formaPago) && <span className="block text-caption text-fg-3">{[p.formaPago && (FORMA_PAGO[p.formaPago] ?? p.formaPago), p.folio && `Folio ${p.folio}`].filter(Boolean).join(" · ")}</span>}
            </span>
            <span className="shrink-0 font-semibold text-fg tabular-nums">{formatCurrency(p.monto)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={`sticky top-[52px] z-10 border-b border-stroke-3 bg-surface py-2 font-semibold first:pr-3 last:pl-3 lg:top-[49px] not-first:not-last:px-3 ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}

function Monto({ value, always = false }: { value: number; always?: boolean }) {
  return (
    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
      {value > 0 || always ? formatCurrency(value) : <span className="text-fg-4">—</span>}
    </td>
  );
}
