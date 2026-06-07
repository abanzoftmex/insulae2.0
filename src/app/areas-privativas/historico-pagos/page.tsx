import Link from "next/link";
import { AlertCircle, FileSpreadsheet, ArrowLeft } from "lucide-react";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/shared/infrastructure/db/prisma";

import { PaymentActions } from "./_components/payment-actions";
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

const COMMERCE_GROUP_KEYWORDS = [
  "comercio",
  "comercial",
  "local",
  "arrend",
  "renta",
];

function isCommerceGroup(name: string, chargeType: string | null): boolean {
  const normalizedName = name.toLowerCase();
  const normalizedType = (chargeType ?? "").toLowerCase();

  return COMMERCE_GROUP_KEYWORDS.some(
    (keyword) => normalizedName.includes(keyword) || normalizedType.includes(keyword),
  );
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case "CASH":
      return "Efectivo";
    case "TRANSFER":
      return "Transferencia";
    case "CARD":
      return "Tarjeta";
    case "CHECK":
      return "Cheque";
    default:
      return "Otro";
  }
}

export default async function HistoricoPagosPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const resolvedReference = await resolvePrivateAreaReference(resolvedSearchParams);
  const opc = parseOpc(resolvedSearchParams);

  if (!resolvedReference) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-20">
        <Card className="w-full max-w-sm text-center border-transparent shadow-layered p-8">
          <Badge variant="brand" className="w-fit mx-auto rounded-full px-4 py-2 text-[10px] tracking-widest mb-4">
            Histórico de Pagos
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
            Histórico de Pagos
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

  const { area } = pageData;
  const isComercio = opc === "2";

  // Fetch all payment history for this private area
  const dbPayments = await prisma.payment.findMany({
    where: {
      privateAreaId: area.privateAreaId,
      isLegacyActive: { not: false },
    },
    include: {
      allocations: {
        include: {
          charge: {
            include: {
              allocations: {
                include: {
                  payment: true,
                },
              },
              chargeGroup: true,
            },
          },
        },
      },
      details: {
        include: {
          chargeGroup: true,
        },
      },
    },
    orderBy: {
      paidAt: "desc",
    },
  });

  // Filter payments in memory based on the opc context (Owner vs Commerce)
  const filteredPayments = dbPayments.filter((payment) => {
    const hasCommerceAllocations = payment.allocations.some(
      (alloc) => alloc.charge.responsibility === "COMMERCE"
    );
    const hasOwnerAllocations = payment.allocations.some(
      (alloc) => alloc.charge.responsibility === "OWNER"
    );

    const hasCommerceDetails = payment.details.some(
      (detail) =>
        detail.chargeGroup &&
        isCommerceGroup(detail.chargeGroup.name, detail.chargeGroup.chargeType)
    );
    const hasOwnerDetails = payment.details.some(
      (detail) =>
        detail.chargeGroup &&
        !isCommerceGroup(detail.chargeGroup.name, detail.chargeGroup.chargeType)
    );

    if (isComercio) {
      return hasCommerceAllocations || hasCommerceDetails;
    } else {
      const hasNoInfo = payment.allocations.length === 0 && payment.details.length === 0;
      return hasOwnerAllocations || hasOwnerDetails || hasNoInfo;
    }
  });

  return (
    <PrivateAreaActionShell
      area={area}
      title={isComercio ? "Histórico · Comercio" : "Histórico · Propietario"}
      subtitle="Consulta del registro histórico de abonos y asignación detallada por cuota."
      activePage={isComercio ? "listado-pagos-comercio" : "listado-pagos-propietario"}
    >
      <div className="flex items-center justify-between pb-2 border-b border-[#ddd0be] mb-6">
        <h2 className="text-xl font-bold text-[#3a2a18] flex items-center gap-2">
          Historial de pagos
        </h2>
        <Button variant="outline" size="sm" asChild className="h-8 text-[11px] font-bold border-[#ddd0be] hover:bg-[#fbf9f4]">
          <Link href={buildActionHref("listado-pagos", area.privateAreaId, opc)} className="flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al listado
          </Link>
        </Button>
      </div>

      <div className="space-y-8 mb-20">
        {filteredPayments.length === 0 ? (
          <Card className="border border-dashed border-[#ddd0be] bg-[#fbf9f4] p-8 text-center text-[12px] text-ink-soft">
            No hay pagos registrados en este historial.
          </Card>
        ) : (
          filteredPayments.map((payment) => {
            const paymentAmount = Number(payment.amount) > 0
              ? Number(payment.amount)
              : payment.details.reduce((sum, d) => sum + Number(d.amount), 0);

            const isCancelled = payment.legacyStatusCode === 2;

            return (
              <div
                key={payment.id}
                className={`border border-[#ddd0be] rounded-md overflow-hidden bg-white shadow-sm transition-all duration-300 ${
                  isCancelled ? "opacity-60 border-red-200" : ""
                }`}
              >
                {/* 1. Datos de pago */}
                <div className="bg-[#e9f0f9] px-4 py-3 border-b border-[#e1ebf6] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-bold text-[#2c3e50] uppercase tracking-wider">
                      Datos de pago
                    </span>
                    {isCancelled && (
                      <Badge variant="danger" className="rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Cancelado
                      </Badge>
                    )}
                  </div>
                  <div>
                    <PaymentActions
                      paymentId={payment.id}
                      legacyId={payment.legacyId}
                      opc={opc}
                    />
                  </div>
                </div>

                <div className="p-4 space-y-6">
                  {/* Table 1: Datos de pago */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-[#3a2a18]">
                      <thead>
                        <tr className="bg-[#fbf9f4] border border-[#d6c7b3] text-left text-ink-soft uppercase tracking-wider font-bold">
                          <th className="px-3 py-2 border-r border-[#d6c7b3]">Folio</th>
                          <th className="px-3 py-2 border-r border-[#d6c7b3]">Forma de pago</th>
                          <th className="px-3 py-2 border-r border-[#d6c7b3]">Fecha real de cobro</th>
                          <th className="px-3 py-2 border-r border-[#d6c7b3] text-right">Abono realizado</th>
                          <th className="px-3 py-2">Comentarios</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-x border-b border-[#d6c7b3]">
                          <td className="px-3 py-2 border-r border-[#d6c7b3] font-bold">
                            {payment.reference || "—"}
                          </td>
                          <td className="px-3 py-2 border-r border-[#d6c7b3]">
                            {getPaymentMethodLabel(payment.method)}
                          </td>
                          <td className="px-3 py-2 border-r border-[#d6c7b3]">
                            {formatDate(payment.paidAt)}
                          </td>
                          <td className="px-3 py-2 border-r border-[#d6c7b3] text-right font-bold">
                            {formatCurrency(paymentAmount)}
                          </td>
                          <td className="px-3 py-2 italic text-ink-soft">
                            {payment.notes || "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Table 2: Detalle de aplicación por tipo de cuota */}
                  {payment.details.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-[#b58b4f] uppercase tracking-wider">
                        Detalle de aplicación por tipo de cuota
                      </h4>
                      <div className="overflow-x-auto max-w-xl">
                        <table className="w-full text-[11px] text-[#3a2a18]">
                          <thead>
                            <tr className="bg-[#fbf9f4] border border-[#d6c7b3] text-left text-ink-soft uppercase tracking-wider font-bold">
                              <th className="px-3 py-2 border-r border-[#d6c7b3]">Tipo de cuota</th>
                              <th className="px-3 py-2 border-r border-[#d6c7b3] text-right">Monto</th>
                              <th className="px-3 py-2 text-right">Saldo a favor generado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payment.details.map((detail) => (
                              <tr key={detail.id} className="border-x border-b border-[#d6c7b3] hover:bg-[#fbfbfb]">
                                <td className="px-3 py-2 border-r border-[#d6c7b3] font-medium">
                                  {detail.chargeGroup?.name || "Cuota General"}
                                </td>
                                <td className="px-3 py-2 border-r border-[#d6c7b3] text-right font-bold">
                                  {formatCurrency(Number(detail.amount))}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-green-600">
                                  {Number(detail.creditBalance) > 0
                                    ? formatCurrency(Number(detail.creditBalance))
                                    : "$0.00"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Table 3: Concepto(s) cubierto(s) por el pago */}
                  {payment.allocations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-[#b58b4f] uppercase tracking-wider">
                        Conceptos cubiertos por el pago
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-[#3a2a18] whitespace-nowrap">
                          <thead>
                            <tr className="bg-[#fbf9f4] border border-[#d6c7b3] text-left text-ink-soft uppercase tracking-wider font-bold">
                              <th className="px-3 py-2 border-r border-[#d6c7b3]">AP</th>
                              <th className="px-3 py-2 border-r border-[#d6c7b3]">Concepto</th>
                              <th className="px-3 py-2 border-r border-[#d6c7b3]">Fecha de vencimiento</th>
                              <th className="px-3 py-2 border-r border-[#d6c7b3] text-right">Cargo</th>
                              <th className="px-3 py-2 border-r border-[#d6c7b3] text-right">Abono totalidad</th>
                              <th className="px-3 py-2 border-r border-[#d6c7b3] text-right">Abono parcialidad</th>
                              <th className="px-3 py-2 text-right">Saldo restante</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payment.allocations.map((alloc) => {
                              const isFullPayment =
                                Number(alloc.amount) >= Number(alloc.charge.amount);

                              // Calculate remaining balance after this allocation (simulating legacy sequence logic)
                              const priorAllocations = alloc.charge.allocations.filter((otherAlloc) => {
                                const otherPaidAt = otherAlloc.payment.paidAt.getTime();
                                const currentPaidAt = payment.paidAt.getTime();
                                if (otherPaidAt < currentPaidAt) return true;
                                if (otherPaidAt === currentPaidAt && otherAlloc.payment.id < payment.id) return true;
                                return false;
                              });

                              const totalPriorPaid = priorAllocations.reduce(
                                (sum, otherAlloc) => sum + Number(otherAlloc.amount),
                                0
                              );
                              const currentAllocPaid = Number(alloc.amount);
                              const remainingBalance = Math.max(
                                0,
                                Number(alloc.charge.amount) - totalPriorPaid - currentAllocPaid
                              );

                              return (
                                <tr key={alloc.id} className="border-x border-b border-[#d6c7b3] hover:bg-[#fbfbfb]">
                                  <td className="px-3 py-2 border-r border-[#d6c7b3]">
                                    {area.name}
                                  </td>
                                  <td className="px-3 py-2 border-r border-[#d6c7b3] font-medium">
                                    {alloc.charge.concept || `${alloc.charge.chargeGroup.name} ${alloc.charge.periodYear}`}
                                  </td>
                                  <td className="px-3 py-2 border-r border-[#d6c7b3]">
                                    {formatDate(alloc.charge.dueDate)}
                                  </td>
                                  <td className="px-3 py-2 border-r border-[#d6c7b3] text-right font-bold">
                                    {formatCurrency(Number(alloc.charge.amount))}
                                  </td>
                                  <td className="px-3 py-2 border-r border-[#d6c7b3] text-right font-bold text-green-700 bg-green-50/30">
                                    {isFullPayment ? formatCurrency(Number(alloc.amount)) : "—"}
                                  </td>
                                  <td className="px-3 py-2 border-r border-[#d6c7b3] text-right font-bold text-amber-700 bg-amber-50/20">
                                    {!isFullPayment ? formatCurrency(Number(alloc.amount)) : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-[#b58b4f]">
                                    {formatCurrency(remainingBalance)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </PrivateAreaActionShell>
  );
}
