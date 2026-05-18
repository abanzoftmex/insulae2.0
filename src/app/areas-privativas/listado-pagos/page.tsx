import Link from "next/link";
import { AlertCircle, Receipt, Wallet } from "lucide-react";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";

import { PrivateAreaActionShell } from "../_components/private-area-action-shell";
import {
  type ActionPageSearchParams,
  buildActionHref,
  formatCurrency,
  formatDate,
  parseOpc,
  resolvePrivateAreaReference,
} from "../_lib/private-area-action-routing";

type PageProps = {
  searchParams?: Promise<ActionPageSearchParams>;
};

function periodLabel(year: number, month: number): string {
  return `${String(month).padStart(2, "0")}/${year}`;
}

export default async function ListadoPagosPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const resolvedReference = await resolvePrivateAreaReference(resolvedSearchParams);
  const opc = parseOpc(resolvedSearchParams);

  if (!resolvedReference) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-20">
        <Card className="w-full max-w-sm text-center border-transparent shadow-layered p-8">
          <Badge variant="brand" className="w-fit mx-auto rounded-full px-4 py-2 text-[10px] tracking-widest mb-4">
            Listado de Pagos
          </Badge>
          <h1 className="text-2xl font-bold text-ink tracking-tighter uppercase">ID inválido</h1>
          <p className="mt-3 text-[12px] text-ink-soft">
            Para abrir esta pantalla necesitas enviar un identificador válido.
          </p>
          <Button variant="dark" size="sm" asChild className="mt-6">
            <Link href="/areas-privativas">Volver a Áreas Privativas</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const pageData = await getPrivateAreaActionPageDataUseCase.execute({
    privateAreaId: resolvedReference.privateAreaId,
    opc,
  });

  if (!pageData) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-20">
        <Card className="w-full max-w-sm text-center border-transparent shadow-layered p-8">
          <Badge variant="brand" className="w-fit mx-auto rounded-full px-4 py-2 text-[10px] tracking-widest mb-4">
            Listado de Pagos
          </Badge>
          <h1 className="text-2xl font-bold text-ink tracking-tighter uppercase">Área no encontrada</h1>
          <p className="mt-3 text-[12px] text-ink-soft">
            No encontramos un Área Privativa con ese identificador.
          </p>
          <Button variant="dark" size="sm" asChild className="mt-6">
            <Link href="/areas-privativas">Volver a Áreas Privativas</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const { area, visibleChargeLines, visiblePaymentMovements, didFallbackToAllCharges } =
    pageData;

  const totalCharged = visibleChargeLines.reduce(
    (total, charge) => total + charge.amount,
    0,
  );
  const totalPaid = visibleChargeLines.reduce(
    (total, charge) => total + charge.paidAmount,
    0,
  );
  const totalBalance = visibleChargeLines.reduce(
    (total, charge) => total + charge.balanceAmount,
    0,
  );

  const isComercio = opc === "1";

  return (
    <PrivateAreaActionShell
      area={area}
      title={isComercio ? "Pagos · Comercio" : "Pagos · Propietario"}
      subtitle="Consolidado de cargos y pagos sobre el área privativa, con navegación por contexto legacy opc."
      activePage={isComercio ? "listado-pagos-comercio" : "listado-pagos-propietario"}
    >
      {/* Context switcher */}
      <Card className="border-transparent shadow-layered">
        <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex-row items-center justify-between gap-3">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">
            Contexto de cargos
          </CardTitle>
          <div className="flex gap-2">
            <Link
              href={buildActionHref("listado-pagos", area.privateAreaId, "2")}
              className={
                !isComercio
                  ? "rounded-full bg-white/20 border border-white/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
                  : "rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:border-white/30 transition-standard"
              }
            >
              Propietario
            </Link>
            <Link
              href={buildActionHref("listado-pagos", area.privateAreaId, "1")}
              className={
                isComercio
                  ? "rounded-full bg-white/20 border border-white/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
                  : "rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:border-white/30 transition-standard"
              }
            >
              Comercio
            </Link>
          </div>
        </CardHeader>
        {didFallbackToAllCharges && (
          <CardContent className="p-3">
            <div className="flex items-center gap-2 rounded bg-gold-soft border border-gold/20 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
              <p className="text-[11px] font-medium text-ink-soft">
                No se detectaron cargos específicos para este contexto; se muestran todos los cargos del área.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard accent="brand" label="Total cargado" value={formatCurrency(totalCharged)} icon={<Receipt className="h-3.5 w-3.5" />} />
        <StatCard accent="lime" label="Total pagado" value={formatCurrency(totalPaid)} icon={<Wallet className="h-3.5 w-3.5" />} />
        <StatCard
          accent={totalBalance > 0 ? "gold" : "cyan"}
          label="Saldo"
          value={formatCurrency(totalBalance)}
          icon={<Receipt className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Tables */}
      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Cargos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-[12px]">
                <thead>
                  <tr className="bg-canvas text-left text-[10px] font-bold uppercase tracking-widest text-brand">
                    <th className="border-b border-line px-3 py-2.5">Periodo</th>
                    <th className="border-b border-line px-3 py-2.5">Grupo</th>
                    <th className="border-b border-line px-3 py-2.5">Cargo</th>
                    <th className="border-b border-line px-3 py-2.5">Pagado</th>
                    <th className="border-b border-line px-3 py-2.5">Saldo</th>
                    <th className="border-b border-line px-3 py-2.5">Vence</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleChargeLines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-[11px] text-ink-soft">
                        No hay cargos registrados para esta área.
                      </td>
                    </tr>
                  ) : (
                    visibleChargeLines.map((charge) => (
                      <tr key={charge.id} className="hover:bg-canvas/60 transition-colors">
                        <td className="border-b border-line/40 px-3 py-2 font-bold tabular-nums text-ink">
                          {periodLabel(charge.periodYear, charge.periodMonth)}
                        </td>
                        <td className="border-b border-line/40 px-3 py-2 text-ink-soft">{charge.chargeGroupName}</td>
                        <td className="border-b border-line/40 px-3 py-2 font-bold tabular-nums text-ink">{formatCurrency(charge.amount)}</td>
                        <td className="border-b border-line/40 px-3 py-2 tabular-nums text-ink-soft">{formatCurrency(charge.paidAmount)}</td>
                        <td className="border-b border-line/40 px-3 py-2 font-bold tabular-nums text-ink">{formatCurrency(charge.balanceAmount)}</td>
                        <td className="border-b border-line/40 px-3 py-2 text-ink-soft">{formatDate(charge.dueDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Pagos aplicados</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {visiblePaymentMovements.length === 0 ? (
              <p className="rounded border border-dashed border-line bg-canvas px-3 py-4 text-center text-[11px] text-ink-soft">
                No hay pagos asociados a los cargos visibles.
              </p>
            ) : (
              visiblePaymentMovements.map((payment) => (
                <div
                  key={payment.paymentId}
                  className="rounded bg-canvas border border-line/50 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-bold text-ink">{formatDate(payment.paidAt)}</p>
                    <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">
                      {payment.method}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 text-[10px] text-ink-soft">
                    <p><span className="font-bold uppercase tracking-wider">Ref.</span> {payment.reference ?? "—"}</p>
                    <p><span className="font-bold uppercase tracking-wider">Notas</span> {payment.notes ?? "—"}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-line/40">
                    <p className="text-[10px] text-ink-soft">Monto pago: <span className="font-bold text-ink">{formatCurrency(payment.paymentTotalAmount)}</span></p>
                    <p className="text-[10px] text-ink-soft">Aplicado: <span className="font-bold text-brand">{formatCurrency(payment.allocatedAmount)}</span></p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </PrivateAreaActionShell>
  );
}
