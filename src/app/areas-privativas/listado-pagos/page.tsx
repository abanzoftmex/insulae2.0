import Link from "next/link";
import { AlertCircle, Receipt, Wallet } from "lucide-react";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { prisma } from "@/shared/infrastructure/db/prisma";

import { CapturarCuotaDialog } from "./_components/capturar-cuota-dialog";
import { EditarCuotaDialog } from "./_components/editar-cuota-dialog";
import { BorrarCuotaDialog } from "./_components/borrar-cuota-dialog";
import { ActionBarButtons } from "./_components/action-bar-buttons";
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

  // Query active charge groups for this condominium
  const areaCondo = await prisma.privateArea.findUnique({
    where: { id: area.privateAreaId },
    select: { condominiumId: true },
  });

  const chargeGroups = areaCondo
    ? await prisma.chargeGroup.findMany({
        where: { condominiumId: areaCondo.condominiumId, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const totalCharged = visibleChargeLines.reduce((total, charge) => total + charge.amount, 0);
  const totalPaid = visibleChargeLines.reduce((total, charge) => total + charge.paidAmount, 0);
  const totalBalance = visibleChargeLines.reduce((total, charge) => total + charge.balanceAmount, 0);

  const totalInterests = visibleChargeLines.reduce((total, charge) => total + charge.interestAmount, 0);
  const totalDiscounts = visibleChargeLines.reduce((total, charge) => total + charge.discountAmount, 0);

  // DEBE AL DÍA: only charges whose dueDate is in the past or today
  const today = new Date();
  const visibleChargesDueToday = visibleChargeLines.filter((charge) => {
    if (!charge.dueDate) return true;
    return new Date(charge.dueDate) <= today;
  });

  const totalBalanceDueToday = visibleChargesDueToday.reduce((total, charge) => total + charge.balanceAmount, 0);
  const totalInterestsDueToday = visibleChargesDueToday.reduce((total, charge) => total + charge.interestAmount, 0);

  // opc=1 → Propietario (busca en asignaciones), opc=2 → Comercio (busca en arrendamientos)
  const isComercio = opc === "2";

  const saldoAFavorValue = isComercio
    ? Number((area as any).payload?.saldoAFavorComercio || 0)
    : Number((area as any).payload?.saldoAFavor || 0);

  const finalBalanceDueToday = totalBalanceDueToday - saldoAFavorValue;

  // Resolve contact: for Comercio (opc=1), use the most recent active rental's admin contact.
  // For Propietario (opc=2), use the owner/administrador assignment.
  let contactUser: { name: string; email: string | null; phone: string | null } | undefined;

  if (isComercio) {
    // Find the most recent rental that has an administrativeContactUser
    const activeRental = area.rentals.find((r) => r.administrativeContactUser != null);
    const rentalContact = activeRental?.administrativeContactUser;
    if (rentalContact) {
      contactUser = { name: rentalContact.name, email: rentalContact.email, phone: rentalContact.phone };
    }
  } else {
    const ownerAssignment =
      area.assignments.find((a) =>
        (a.roleName || "").toLowerCase().includes("propietario") ||
        (a.roleName || "").toLowerCase().includes("dueño")
      ) ??
      area.assignments.find((a) =>
        (a.roleName || "").toLowerCase().includes("administrador")
      ) ??
      area.assignments.find((a) => a.roleBucket === "ACTUAL");
    contactUser = ownerAssignment?.user;
  }

  // Group charges by chargeGroupName for the breakdown tables
  const chargeSummaryByGroup = new Map<string, { charged: number; balance: number; balanceDueToday: number }>();
  for (const charge of visibleChargeLines) {
    const groupName = charge.chargeGroupName;
    const existing = chargeSummaryByGroup.get(groupName) || { charged: 0, balance: 0, balanceDueToday: 0 };
    existing.charged += charge.amount;
    existing.balance += charge.balanceAmount;
    if (!charge.dueDate || new Date(charge.dueDate) <= today) {
      existing.balanceDueToday += charge.balanceAmount;
    }
    chargeSummaryByGroup.set(groupName, existing);
  }
  const summaryRows = Array.from(chargeSummaryByGroup.entries())
    .map(([name, totals]) => ({ name, ...totals }))
    .sort((a, b) => a.name.localeCompare(b.name));

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
              href={buildActionHref("listado-pagos", area.privateAreaId, "1")}
              className={
                !isComercio
                  ? "rounded-full bg-white/20 border border-white/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
                  : "rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:border-white/30 transition-standard"
              }
            >
              Propietario
            </Link>
            <Link
              href={buildActionHref("listado-pagos", area.privateAreaId, "2")}
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

      <div className="space-y-6 mt-6">
        {/* Contacto Simple */}
        <div className="border-b border-[#ddd0be] pb-2">
          <h2 className="text-xl font-bold text-[#3a2a18]">Contacto</h2>
          {contactUser ? (
            <div className="mt-3 text-[13px] text-[#3a2a18] space-y-1">
              <p>Nombre: <span className="font-bold">{contactUser.name}</span></p>
              <p>Email: <span className="font-bold">{contactUser.email || "—"}</span></p>
              <p>Teléfono: <span className="font-bold">{contactUser.phone || "—"}</span></p>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[#3a2a18] italic">No hay contacto registrado.</p>
          )}
        </div>

        {/* Resúmenes */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* DEBE AL DÍA / SALDO A FAVOR */}
          <div>
            <div className="flex bg-white border border-[#d6c7b3] rounded-t-md">
              <div className="flex-1 text-center py-4 border-r border-[#d6c7b3]">
                <div className="flex items-center justify-center gap-2 mb-1 text-[#b58b4f]">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-[12px] font-bold uppercase">Debe al día</span>
                </div>
                <p className="text-[15px] font-bold text-[#3a2a18]">{formatCurrency(finalBalanceDueToday)}</p>
              </div>
              <div className="flex-1 text-center py-4">
                <div className="flex items-center justify-center gap-2 mb-1 text-[#b58b4f]">
                  <span className="text-[16px]">👍</span>
                  <span className="text-[12px] font-bold uppercase">Saldo a favor</span>
                </div>
                <p className="text-[15px] font-bold text-[#3a2a18]">{formatCurrency(saldoAFavorValue)}</p>
              </div>
            </div>
            <div className="bg-[#fbf9f4] border-x border-b border-[#d6c7b3] rounded-b-md p-0">
              <table className="w-full text-[11px] text-[#3a2a18]">
                <tbody>
                  <tr className="border-b border-[#e5d5b5]">
                    <td className="px-3 py-1.5">Saldo inicial:</td>
                    <td className="px-3 py-1.5 text-right font-bold">$0.00</td>
                  </tr>
                  {summaryRows.filter(r => r.balanceDueToday > 0).map((row) => (
                    <tr key={row.name} className={`border-b border-[#e5d5b5] bg-[#ffecd6]`}>
                      <td className="px-3 py-1.5">{row.name}:</td>
                      <td className="px-3 py-1.5 text-right font-bold">{formatCurrency(row.balanceDueToday)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-[#e5d5b5]">
                    <td className="px-3 py-1.5">Intereses moratorios:</td>
                    <td className="px-3 py-1.5 text-right font-bold">{formatCurrency(totalInterestsDueToday)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CARGOS TOTALES */}
          <div>
            <div className="flex bg-white border border-[#d6c7b3] rounded-t-md">
              <div className="flex-1 text-center py-4">
                <div className="flex items-center justify-center gap-2 mb-1 text-[#b58b4f]">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-[12px] font-bold uppercase">Cargos Totales</span>
                </div>
                <p className="text-[15px] font-bold text-[#3a2a18]">{formatCurrency(totalCharged)}</p>
              </div>
            </div>
            <div className="bg-[#fbf9f4] border-x border-b border-[#d6c7b3] rounded-b-md p-0">
              <table className="w-full text-[11px] text-[#3a2a18]">
                <tbody>
                  <tr className="border-b border-[#e5d5b5]">
                    <td className="px-3 py-1.5">Saldo inicial:</td>
                    <td className="px-3 py-1.5 text-right font-bold">$0.00</td>
                  </tr>
                  {summaryRows.map((row) => (
                    <tr key={row.name} className="border-b border-[#e5d5b5]">
                      <td className="px-3 py-1.5">{row.name}:</td>
                      <td className="px-3 py-1.5 text-right font-bold">{formatCurrency(row.charged)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-[#e5d5b5]">
                    <td className="px-3 py-1.5">Intereses moratorios:</td>
                    <td className="px-3 py-1.5 text-right font-bold">{formatCurrency(totalInterests)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">Descuentos:</td>
                    <td className="px-3 py-1.5 text-right font-bold">{formatCurrency(totalDiscounts)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ÚLTIMOS PAGOS REALIZADOS */}
        <div className="border border-[#e1ebf6] rounded-md overflow-hidden bg-white">
          <div className="bg-white text-center py-3 border-b border-[#e1ebf6] text-[#3a2a18] text-[12px] uppercase flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#3a2a18]" /> Últimos pagos realizados
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#e9f0f9] text-[#2c3e50] font-bold">
                <th className="py-2 px-3 text-left">Folio</th>
                <th className="py-2 px-3 text-left">Forma de pago</th>
                <th className="py-2 px-3 text-left">Fecha real de cobro</th>
                <th className="py-2 px-3 text-right">Abono realizado</th>
              </tr>
            </thead>
            <tbody>
              {visiblePaymentMovements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 px-3 text-center text-gray-500 italic">No hay pagos registrados</td>
                </tr>
              ) : (
                visiblePaymentMovements.map(payment => (
                  <tr key={payment.paymentId} className="border-b border-[#e1ebf6] last:border-0">
                    <td className="py-2 px-3 font-bold">{payment.reference || payment.paymentId.substring(0, 8)}</td>
                    <td className="py-2 px-3">{getPaymentMethodLabel(payment.method)}</td>
                    <td className="py-2 px-3">{formatDate(payment.paidAt)}</td>
                    <td className="py-2 px-3 text-right font-bold text-[#3a2a18]">{formatCurrency(payment.paymentTotalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action Bar (Dark Blue) */}
        <div className="bg-white border border-[#ddd0be] rounded-md p-3 flex flex-wrap items-center gap-2">
          {/* Capturar Cuota is actually a trigger, but for now we render its default appearance */}
          <div className="[&>button]:bg-[#2c3e50] [&>button]:hover:bg-[#1a252f] [&>button]:text-white [&>button]:border-transparent [&>button]:shadow-sm">
            <CapturarCuotaDialog privateAreaId={area.privateAreaId} opc={opc} chargeGroups={chargeGroups} />
          </div>
          
          <Link
            href={buildActionHref("historico-pagos", area.privateAreaId, opc)}
            className="bg-[#2c3e50] text-white text-[11px] font-bold px-4 py-2 rounded shadow-sm hover:bg-[#1a252f] transition-colors flex items-center gap-2"
          >
            <AlertCircle className="h-3.5 w-3.5" /> Histórico de pagos
          </Link>
            {/* Client Buttons: Export, Send, Print */}
            <ActionBarButtons 
              privateAreaId={area.privateAreaId} 
              opc={opc} 
              areaName={area.name} 
              charges={visibleChargeLines} 
            />
        </div>

        {/* Main Charges Table */}
        <div className="border border-[#e1ebf6] rounded-md overflow-hidden bg-white mb-20">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] whitespace-nowrap">
              <thead>
                <tr className="bg-[#e9f0f9] text-[#2c3e50] font-bold">
                  <th className="py-2 px-3 text-center border-b border-[#e1ebf6]">Acciones</th>
                  <th className="py-2 px-3 text-left border-b border-[#e1ebf6]">Tipo de cuota</th>
                  <th className="py-2 px-3 text-left border-b border-[#e1ebf6]">Concepto</th>
                  <th className="py-2 px-3 text-left border-b border-[#e1ebf6]">Fecha de cobro</th>
                  <th className="py-2 px-3 text-left border-b border-[#e1ebf6]">Fecha límite de pago</th>
                  <th className="py-2 px-3 text-left border-b border-[#e1ebf6]">Pagado el</th>
                  <th className="py-2 px-3 text-right border-b border-[#e1ebf6]">Cargo</th>
                  <th className="py-2 px-3 text-right border-b border-[#e1ebf6]">Abono</th>
                  <th className="py-2 px-3 text-right border-b border-[#e1ebf6]">Intereses moratorios</th>
                  <th className="py-2 px-3 text-right border-b border-[#e1ebf6]">Descuento</th>
                  <th className="py-2 px-3 text-right border-b border-[#e1ebf6]">Saldo</th>
                  <th className="py-2 px-3 text-center border-b border-[#e1ebf6]">Comentarios</th>
                </tr>
              </thead>
              <tbody>
                {visibleChargeLines.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 px-3 text-center text-gray-500 italic">No hay cargos registrados</td>
                  </tr>
                ) : (
                  visibleChargeLines.map((charge, i) => {
                    const rowBg = charge.balanceAmount > 0 ? "bg-[#ffecd6]" : (i % 2 === 0 ? "bg-white" : "bg-[#fbfbfb]");
                    return (
                      <tr key={charge.id} className={`border-b border-[#e1ebf6] ${rowBg}`}>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <EditarCuotaDialog charge={charge} chargeGroups={chargeGroups} />
                            <BorrarCuotaDialog chargeId={charge.id} />
                          </div>
                        </td>
                        <td className="py-2 px-3">{charge.chargeGroupName}</td>
                        <td className="py-2 px-3">{charge.chargeGroupName} {charge.periodYear}</td>
                        <td className="py-2 px-3">{formatDate(new Date(charge.periodYear, charge.periodMonth - 1, 1))}</td>
                        <td className="py-2 px-3">{formatDate(charge.dueDate)}</td>
                        <td className="py-2 px-3 text-[#3a2a18]/60">{charge.paymentDates.length > 0 ? charge.paymentDates.join(" / ") : "-"}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#3a2a18]">{formatCurrency(charge.amount)}</td>
                        <td className="py-2 px-3 text-right text-[#3a2a18]">{formatCurrency(charge.paidAmount)}</td>
                        <td className="py-2 px-3 text-right text-[#3a2a18]">$0.00</td>
                        <td className="py-2 px-3 text-right text-[#3a2a18]">$0.00</td>
                        <td className="py-2 px-3 text-right font-bold text-[#b58b4f]">{formatCurrency(charge.balanceAmount)}</td>
                        <td className="py-2 px-3 text-center">
                           <input type="text" className="border border-[#ddd0be] rounded px-2 py-0.5 w-32 text-[10px]" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PrivateAreaActionShell>
  );
}
