/* eslint-disable @next/next/no-img-element */
import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";
import { prisma } from "@/shared/infrastructure/db/prisma";
import {
  type ActionPageSearchParams,
  formatCurrency,
  formatDate,
  parseOpc,
  resolvePrivateAreaReference,
} from "../../_lib/private-area-action-routing";
import { PrintBar } from "./_components/print-trigger";
import { PROJECT_SCOPE } from "@/config/project-scope";

type PageProps = {
  searchParams?: Promise<ActionPageSearchParams>;
};

export default async function ImprimirEstadoCuentaPage({ searchParams }: PageProps) {
  await requirePageAccess(MODULES.AREAS_PRIVATIVAS);

  const resolvedSearchParams = (await searchParams) ?? {};
  const resolvedReference = await resolvePrivateAreaReference(resolvedSearchParams);
  const opc = parseOpc(resolvedSearchParams);

  if (!resolvedReference) {
    return (
      <div className="p-8 text-center bg-white text-black min-h-screen">
        <h1 className="text-xl font-bold text-red-600">ID de área no válido</h1>
        <p className="text-gray-500 mt-2">Por favor, proporcione un identificador válido.</p>
      </div>
    );
  }

  const pageData = await getPrivateAreaActionPageDataUseCase.execute({
    privateAreaId: resolvedReference.privateAreaId,
    opc,
  });

  if (!pageData) {
    return (
      <div className="p-8 text-center bg-white text-black min-h-screen">
        <h1 className="text-xl font-bold text-red-600">Área no encontrada</h1>
        <p className="text-gray-500 mt-2">No se encontró información para el área especificada.</p>
      </div>
    );
  }

  const { area } = pageData;

  const project = await prisma.project.findFirst({
    where: {
      condominium: { slug: PROJECT_SCOPE.condominiumCode },
      isActive: true,
    },
    orderBy: { id: "desc" },
    select: {
      footerLeft: true,
      footerLeftTitle: true,
      footerRight: true,
      footerRightTitle: true,
    },
  });
  void project;

  const mappedCharges = pageData.visibleChargeLines.map((c) => {
    return {
      id: c.id,
      periodYear: c.periodYear,
      periodMonth: c.periodMonth,
      dueDate: c.dueDate,
      concept: c.concept,
      chargeGroupName: c.chargeGroupName,
      chargeGroupType: c.chargeGroupType,
      amount: c.amount,
      interestAmount: c.interestAmount,
      discountAmount: c.discountAmount,
      paidAmount: c.paidAmount,
      balanceAmount: c.balanceAmount,
      paidDatesList: c.paymentDates,
    };
  });

  const chronologicalPayments = [...pageData.visiblePaymentMovements].sort(
    (a, b) => a.paidAt.getTime() - b.paidAt.getTime()
  );

  // Math for card calculations based on current month/year
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  const isPastOrCurrentPeriod = (year: number, month: number) => {
    return year < todayYear || (year === todayYear && month <= todayMonth);
  };

  const pastOrCurrentCharges = mappedCharges.filter((c) =>
    isPastOrCurrentPeriod(c.periodYear, c.periodMonth)
  );

  // DEBE AL DÍA calculations (Card 1)
  const totalBalance = pastOrCurrentCharges.reduce((sum, c) => sum + c.balanceAmount, 0);

  // Grouped balances for Debe al día breakdown list
  let ordinariasBalance = 0;
  let extraordinariasCondominosBalance = 0;
  let stcBalance = 0;
  let sancionBalance = 0;
  let extraordinariaComerciosBalance = 0;
  let comodatoBalance = 0;
  let interesesBalance = 0;

  for (const c of pastOrCurrentCharges) {
    const name = c.chargeGroupName.toLowerCase();
    const type = (c.chargeGroupType ?? "").toLowerCase();

    interesesBalance += c.interestAmount;

    if (name.includes("ordinaria")) {
      ordinariasBalance += c.balanceAmount;
    } else if (name.includes("stc")) {
      stcBalance += c.balanceAmount;
    } else if (name.includes("sancion") || name.includes("multa")) {
      sancionBalance += c.balanceAmount;
    } else if (name.includes("comodato")) {
      comodatoBalance += c.balanceAmount;
    } else if (name.includes("extraordinaria")) {
      if (name.includes("comercio") || type.includes("comercio")) {
        extraordinariaComerciosBalance += c.balanceAmount;
      } else {
        extraordinariasCondominosBalance += c.balanceAmount;
      }
    }
  }

  // CARGOS TOTALES calculations (Card 2)
  const totalChargedAmount = mappedCharges.reduce((sum, c) => sum + c.amount, 0);
  const totalInterestsCharged = mappedCharges.reduce((sum, c) => sum + c.interestAmount, 0);
  const totalDiscounts = mappedCharges.reduce((sum, c) => sum + c.discountAmount, 0);
  const totalCargosCard = totalChargedAmount + totalInterestsCharged - totalDiscounts;

  // Grouped amounts for Cargos Totales breakdown list
  let ordinariasCharged = 0;
  let extraordinariasCondominosCharged = 0;
  let stcCharged = 0;
  let sancionCharged = 0;
  let extraordinariaComerciosCharged = 0;
  let comodatoCharged = 0;

  for (const c of mappedCharges) {
    const name = c.chargeGroupName.toLowerCase();
    const type = (c.chargeGroupType ?? "").toLowerCase();

    if (name.includes("ordinaria")) {
      ordinariasCharged += c.amount;
    } else if (name.includes("stc")) {
      stcCharged += c.amount;
    } else if (name.includes("sancion") || name.includes("multa")) {
      sancionCharged += c.amount;
    } else if (name.includes("comodato")) {
      comodatoCharged += c.amount;
    } else if (name.includes("extraordinaria")) {
      if (name.includes("comercio") || type.includes("comercio")) {
        extraordinariaComerciosCharged += c.amount;
      } else {
        extraordinariasCondominosCharged += c.amount;
      }
    }
  }

  // Resolve contact:
  // opc=1 (Propietario): use owner/dueño assignment
  // opc=2 (Comercio): use the first rental that has an administrativeContactUser
  let contactUser: { name: string; email: string | null; phone: string | null } | undefined;

  if (opc === "2") {
    const rentalsWithContact = await prisma.rental.findMany({
      where: { privateAreaId: area.privateAreaId },
      orderBy: { startsAt: "desc" },
      include: {
        administrativeContactUser: {
          select: { id: true, firstName: true, lastName: true, businessName: true, email: true, phone: true },
        },
      },
    });
    const activeRental = rentalsWithContact.find((r) => r.administrativeContactUser != null);
    const rc = activeRental?.administrativeContactUser;
    if (rc) {
      const fullName = rc.businessName?.trim() || `${rc.firstName ?? ""} ${rc.lastName ?? ""}`.trim();
      contactUser = { name: fullName || "—", email: rc.email, phone: rc.phone };
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

  // M2 calculation matching legacy:
  // child area: m2Construction + m2CommonArea
  // parent area: m2Original + m2CommonArea (or m2Apole if m2Original is 0)
  const m2Construction = area.m2Construction ?? 0;
  const m2CommonArea = area.m2CommonArea ?? 0;
  const m2OriginalVal = area.m2Original ?? 0;
  const m2ApoleVal = area.m2Apole ?? 0;
  const displayM2 = area.isChild
    ? m2Construction + m2CommonArea
    : (m2OriginalVal > 0 ? m2OriginalVal : m2ApoleVal) + m2CommonArea;

  const returnUrl = `/areas-privativas/listado-pagos?id=${area.privateAreaId}&opc=${opc}`;

  // Max payment for visual proportion bars in "03 Últimos pagos realizados"
  const maxPaymentAmount = Math.max(
    ...chronologicalPayments.map((p) => p.paymentTotalAmount),
    1
  );

  const formattedCutDate = formatDate(today);
  const formattedCutDateUpper = formattedCutDate.toUpperCase();

  // Helper for Status Badge in Section 04
  const getStatusBadge = (c: typeof mappedCharges[number]) => {
    if (c.balanceAmount <= 0.005) {
      return {
        label: "PAGADO",
        className: "bg-[#e8f5e9] text-[#1b5e20] border border-[#c8e6c9]",
      };
    }
    if (c.paidAmount > 0.005) {
      return {
        label: "PARCIAL",
        className: "bg-[#fff8e1] text-[#b78103] border border-[#ffecb3]",
      };
    }
    const isPast =
      c.periodYear < todayYear ||
      (c.periodYear === todayYear && c.periodMonth <= todayMonth) ||
      (c.dueDate && new Date(c.dueDate) < today);

    if (isPast) {
      return {
        label: "VENCIDO",
        className: "bg-[#ffebee] text-[#c62828] border border-[#ffcdd2]",
      };
    }
    return {
      label: "POR VENCER",
      className: "bg-[#fff3e0] text-[#e65100] border border-[#ffe0b2]",
    };
  };

  return (
    <div className="bg-[#f4efe8] text-slate-900 min-h-screen font-sans pb-12 print:bg-white print:p-0 print:pb-0">
      {/* Print styles definition */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: letter portrait;
                margin: 8mm;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                font-size: 10.5px;
                padding: 0 !important;
                margin: 0 !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-sheet {
                margin: 0 !important;
                padding: 0 !important;
                max-width: none !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                background: #ffffff !important;
              }
              .print-page-1 {
                page-break-after: always !important;
                break-after: page !important;
              }
              .avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              thead {
                display: table-header-group;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      {/* Screen-only top floating action bar */}
      <PrintBar returnUrl={returnUrl} propertyName={area.name} />

      {/* Main printable container (styled as luxury executive statement) */}
      <div className="max-w-[850px] mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-[#e6decb] print-sheet print:shadow-none print:border-none print:rounded-none">

        {/* ======================================================== */}
        {/* PAGE 1: RESUMEN EJECUTIVO / ESTADO DE CUENTA              */}
        {/* ======================================================== */}
        <section className="print-page-1 bg-white relative">

          {/* Top Navy Banner Header */}
          <header className="relative bg-gradient-to-r from-[#111e38] via-[#15284f] to-[#1c3568] text-white pt-8 pb-14 px-8 overflow-hidden">
            {/* Subtle Crest Watermark Background */}
            <div className="absolute right-12 -bottom-10 opacity-[0.07] pointer-events-none select-none">
              <img
                src="/brand/valquirico-logo-light.png"
                alt=""
                className="w-80 h-auto object-contain filter invert"
              />
            </div>

            {/* Top row: Logo & Administration Header */}
            <div className="flex justify-between items-start relative z-10 mb-6">
              <div className="flex items-center gap-3">
                <img
                  src="/brand/valquirico-logo-light.png"
                  alt="Val'Quirico"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                  ADMINISTRADORA VALQUIRICO A.C.
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#dfb76c] mt-0.5">
                  CORTE AL {formattedCutDateUpper}
                </p>
              </div>
            </div>

            {/* Middle row: Title & Área Privativa Badge Card */}
            <div className="flex justify-between items-end relative z-10">
              <div>
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-[#dfb76c] mb-1">
                  SISTEMA CONDOMINAL · REPORTE EJECUTIVO
                </p>
                <h1 className="text-3xl sm:text-4xl font-serif text-white tracking-normal font-normal">
                  Estado de cuenta
                </h1>
              </div>

              {/* Área Privativa Floating Top Badge */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 text-right shadow-sm min-w-[170px]">
                <p className="text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-[#dfb76c]">
                  ÁREA PRIVATIVA
                </p>
                <p className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 font-mono">
                  {area.name}
                </p>
                <div className="mt-1">
                  <span className="inline-block bg-white/15 text-white/95 text-[9.5px] font-bold px-2 py-0.5 rounded-full">
                    {displayM2.toFixed(2)} m²
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Floating KPI Cards (Overlapping header) */}
          <div className="px-8 -mt-7 relative z-20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Card 1 (Hero): DEBE AL DÍA */}
              <div className="bg-gradient-to-br from-[#fffdfa] to-[#fbf4ea] border border-[#edd9bc] rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#dc2626]"></span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#9a3412]">
                      DEBE AL DÍA
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-[#8b1e0f] tracking-tight mt-1.5 font-mono">
                    {formatCurrency(totalBalance)}
                  </p>
                </div>
                <p className="text-[9.5px] text-[#78716c] font-medium mt-2">
                  {totalInterestsCharged > 0
                    ? `Incluye intereses moratorios por ${formatCurrency(totalInterestsCharged)}`
                    : "Cuenta al corriente de cargos vencidos"}
                </p>
              </div>

              {/* Card 2: SALDO A FAVOR */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    SALDO A FAVOR
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                    $0.00
                  </p>
                </div>
                <p className="text-[9.5px] text-slate-400 font-medium mt-2">
                  Sin saldo disponible
                </p>
              </div>

              {/* Card 3: CARGOS TOTALES */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    CARGOS TOTALES
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                    {formatCurrency(totalCargosCard)}
                  </p>
                </div>
                <p className="text-[9.5px] text-slate-400 font-medium mt-2">
                  Histórico acumulado
                </p>
              </div>
            </div>
          </div>

          {/* Body Sections of Page 1 */}
          <div className="p-8 space-y-6">

            {/* Section 01: Datos de la propiedad */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-serif font-black text-[#b8860b]">01</span>
                <h2 className="text-sm font-serif font-bold text-slate-900 tracking-wide">
                  Datos de la propiedad
                </h2>
                <div className="flex-1 border-t border-[#e5dfd5]"></div>
              </div>

              <div className="bg-[#fbf9f5] border border-[#ece6db] rounded-xl p-4 text-[10.5px]">
                {/* Primary property specifications */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-[#eee8dc]">
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
                      Área Privativa
                    </p>
                    <p className="text-xs font-black text-slate-900 mt-0.5 border-b-2 border-[#b8860b] pb-0.5 inline-block">
                      {area.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
                      Superficie
                    </p>
                    <p className="text-xs font-black text-slate-900 mt-0.5 font-mono">
                      {displayM2.toFixed(4)} m²
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
                      Fecha de corte
                    </p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {formattedCutDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
                      Administra
                    </p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      Administradora Valquirico A.C.
                    </p>
                  </div>
                </div>

                {/* Contact and Ownership Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3">
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
                      {opc === "2" ? "Arrendatario / Contacto" : "Propietario / Titular"}
                    </p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5 truncate" title={contactUser?.name || "—"}>
                      {contactUser?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
                      Correo electrónico
                    </p>
                    <p className="text-xs font-medium text-slate-700 mt-0.5 truncate" title={contactUser?.email || "—"}>
                      {contactUser?.email || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
                      Teléfono
                    </p>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">
                      {contactUser?.phone || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
                      Responsabilidad
                    </p>
                    <div className="mt-0.5">
                      {opc === "2" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-[#fff5c7] text-[#78350f] border border-[#ffde6b]">
                          Comercio (C)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-[#e0ecff] text-[#1e3a8a] border border-[#c7dbff]">
                          Propietario (P)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 02: Composición del saldo */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-serif font-black text-[#b8860b]">02</span>
                <h2 className="text-sm font-serif font-bold text-slate-900 tracking-wide">
                  Composición del saldo
                </h2>
                <div className="flex-1 border-t border-[#e5dfd5]"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Left Card: ADEUDO AL DÍA */}
                <div className="bg-[#fbf9f5] border border-[#ece6db] rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-baseline pb-2 mb-2 border-b border-[#ece6db]">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#9a3412]">
                      ADEUDO AL DÍA
                    </span>
                    <span className="text-sm font-black text-[#8b1e0f] font-mono">
                      {formatCurrency(totalBalance)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Saldo inicial</span>
                      <span className="font-bold text-slate-800 font-mono">$0.00</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Cuotas ordinarias</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(ordinariasBalance)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Cuotas extraordinarias – Condóminos</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(extraordinariasCondominosBalance)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Cuotas STC</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(stcBalance)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Sanción</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(sancionBalance)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Cuota extraordinaria – Comercios</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(extraordinariaComerciosBalance)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Comodato</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(comodatoBalance)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 pt-1">
                      <span className="text-slate-900 font-bold">Intereses moratorios</span>
                      <span className="font-black text-[#8b1e0f] font-mono">{formatCurrency(interesesBalance)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Card: CARGOS TOTALES */}
                <div className="bg-[#fbf9f5] border border-[#ece6db] rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-baseline pb-2 mb-2 border-b border-[#ece6db]">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#b8860b]">
                      CARGOS TOTALES
                    </span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {formatCurrency(totalCargosCard)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Saldo inicial</span>
                      <span className="font-bold text-slate-800 font-mono">$0.00</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Cuotas ordinarias</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(ordinariasCharged)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Cuotas extraordinarias – Condóminos</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(extraordinariasCondominosCharged)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Cuotas STC</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(stcCharged)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Sanción</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(sancionCharged)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Cuota extraordinaria – Comercios</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(extraordinariaComerciosCharged)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Comodato</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(comodatoCharged)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 border-b border-dotted border-slate-200">
                      <span className="text-slate-600">Intereses moratorios</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(totalInterestsCharged)}</span>
                    </div>
                    <div className="flex items-baseline justify-between py-0.5 pt-0.5">
                      <span className="text-slate-600">Descuentos</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(totalDiscounts)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 03: Últimos pagos realizados */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-serif font-black text-[#b8860b]">03</span>
                <h2 className="text-sm font-serif font-bold text-slate-900 tracking-wide">
                  Últimos pagos realizados
                </h2>
                <div className="flex-1 border-t border-[#e5dfd5]"></div>
              </div>

              <div className="border border-[#15284f] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-[10.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#15284f] text-white text-[9.5px] font-black uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-left w-1/4">Folio</th>
                      <th className="py-2.5 px-3 text-left w-1/4">Pagado el</th>
                      <th className="py-2.5 px-3 text-left w-1/3">Proporción</th>
                      <th className="py-2.5 px-3 text-right w-1/6">Abono</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece6db]">
                    {chronologicalPayments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 px-3 text-center text-slate-400 italic bg-white">
                          No hay pagos registrados para esta área
                        </td>
                      </tr>
                    ) : (
                      chronologicalPayments.map((p) => {
                        const pct = Math.min(
                          100,
                          Math.max(5, Math.round((p.paymentTotalAmount / maxPaymentAmount) * 100))
                        );

                        return (
                          <tr key={p.paymentId} className="odd:bg-white even:bg-[#faf8f5] hover:bg-amber-50/40 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-900 font-mono">
                              {p.reference || p.paymentId.substring(0, 8)}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              {formatDate(p.paidAt)}
                            </td>
                            <td className="py-2 px-3">
                              <div className="w-full max-w-[200px] bg-[#e8e2d5] h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#c4a56a]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-black text-slate-900 font-mono">
                              {formatCurrency(p.paymentTotalAmount)}
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
        </section>

        {/* ======================================================== */}
        {/* PAGE 2: DETALLE DE MOVIMIENTOS Y FORMAS DE PAGO           */}
        {/* ======================================================== */}
        <section className="bg-white relative border-t-2 border-dashed border-[#e6decb] print:border-none">

          {/* Page 2 Slim Navy Header */}
          <header className="bg-gradient-to-r from-[#111e38] via-[#15284f] to-[#1c3568] text-white px-8 py-3.5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img
                src="/brand/valquirico-logo-light.png"
                alt="Val'Quirico"
                className="h-7 w-auto object-contain"
              />
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#dfb76c]">
                CORTE {formattedCutDateUpper}
              </p>
              <p className="text-xs font-serif text-white/95 font-medium mt-0.5">
                Detalle de movimientos
              </p>
            </div>
          </header>

          <div className="p-8 space-y-6">

            {/* Section 04: Detalle de cuotas */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-serif font-black text-[#b8860b]">04</span>
                <h2 className="text-sm font-serif font-bold text-slate-900 tracking-wide">
                  Detalle de cuotas
                </h2>
                <div className="flex-1 border-t border-[#e5dfd5]"></div>
              </div>

              <div className="border border-[#15284f] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-[#15284f] text-white text-[8.5px] font-black uppercase tracking-wider">
                      <th className="py-2.5 px-2 text-left">Concepto</th>
                      <th className="py-2.5 px-2 text-left">Cobro</th>
                      <th className="py-2.5 px-2 text-left">Límite</th>
                      <th className="py-2.5 px-2 text-left">Pagado el</th>
                      <th className="py-2.5 px-2 text-right">Cargo</th>
                      <th className="py-2.5 px-2 text-right">Abono</th>
                      <th className="py-2.5 px-2 text-right">Int. Mor.</th>
                      <th className="py-2.5 px-2 text-right">Desc.</th>
                      <th className="py-2.5 px-2 text-right">Saldo</th>
                      <th className="py-2.5 px-2 text-center">Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece6db]">
                    {mappedCharges.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-4 px-3 text-center text-slate-400 italic bg-white">
                          No hay cargos registrados para esta área
                        </td>
                      </tr>
                    ) : (
                      mappedCharges.map((c) => {
                        const paidDates = c.paidDatesList.length > 0 ? c.paidDatesList.join(" / ") : "—";
                        const status = getStatusBadge(c);
                        const chargeDate = new Date(c.periodYear, c.periodMonth - 1, 1);

                        return (
                          <tr key={c.id} className="odd:bg-white even:bg-[#faf8f5] hover:bg-amber-50/40 transition-colors">
                            <td className="py-1.5 px-2 font-bold text-slate-900">
                              {c.concept || `${c.chargeGroupName} ${c.periodYear}`}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">
                              {formatDate(chargeDate)}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">
                              {c.dueDate ? formatDate(c.dueDate) : "—"}
                            </td>
                            <td className="py-1.5 px-2 text-slate-500 font-medium whitespace-nowrap">
                              {paidDates}
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold text-slate-900 font-mono">
                              {formatCurrency(c.amount)}
                            </td>
                            <td className="py-1.5 px-2 text-right text-slate-700 font-mono">
                              {formatCurrency(c.paidAmount)}
                            </td>
                            <td className="py-1.5 px-2 text-right text-slate-600 font-mono">
                              {formatCurrency(c.interestAmount)}
                            </td>
                            <td className="py-1.5 px-2 text-right text-slate-600 font-mono">
                              {formatCurrency(c.discountAmount)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-black text-slate-900 font-mono">
                              {formatCurrency(c.balanceAmount)}
                            </td>
                            <td className="py-1.5 px-2 text-center whitespace-nowrap">
                              <span
                                className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 05: Formas de pago (avoid page break inside) */}
            <div className="avoid-break pt-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-serif font-black text-[#b8860b]">05</span>
                <h2 className="text-sm font-serif font-bold text-slate-900 tracking-wide">
                  Formas de pago
                </h2>
                <div className="flex-1 border-t border-[#e5dfd5]"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">

                {/* Left Card: CONDICIONES */}
                <div className="sm:col-span-7 bg-[#fbf9f5] border border-[#ece6db] rounded-xl p-4 text-[9.5px] text-slate-700 flex flex-col justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#b8860b] mb-2">
                      CONDICIONES
                    </p>
                    <p className="leading-relaxed mb-2.5">
                      La cuota ordinaria condominal se paga dentro de los primeros 7 días hábiles del mes; a partir del día 8 genera interés moratorio conforme al Reglamento General de Condóminos, artículo 3.9 (mora en los pagos).
                    </p>

                    <ol className="space-y-1 pl-4 list-decimal text-slate-800 leading-normal">
                      <li>
                        Sólo se aceptarán pagos mediante transferencia, terminal bancaria (oficinas de administración) y pagos domiciliados.
                      </li>
                      <li>
                        No se aceptan depósitos en efectivo en cuenta bancaria.
                      </li>
                      <li>
                        Identifique su comprobante con el concepto VQ# (número de propiedad), tipo de cuota (ordinaria o extraordinaria) y el mes o año que está pagando. Ej: VQ#001 Cuota Ordinaria Jul 2025.
                      </li>
                      <li>
                        Pagos no identificados no se reflejarán oportunamente.
                      </li>
                    </ol>
                  </div>

                  <div className="border-t border-[#ece6db] pt-2 mt-3 flex justify-between items-center text-[9px] text-slate-600">
                    <span>
                      <strong className="text-slate-900">Razón social:</strong> ADMINISTRADORA VALQUIRICO A.C.
                    </span>
                    <span>
                      <strong className="text-slate-900">RFC:</strong> AVA1706221G3
                    </span>
                  </div>
                </div>

                {/* Right Card: DATOS BANCARIOS */}
                <div className="sm:col-span-5 bg-gradient-to-br from-[#111e38] to-[#15284f] text-white rounded-xl p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#dfb76c] mb-3">
                      DATOS BANCARIOS
                    </p>

                    {/* Bank 1: Inbursa */}
                    <div className="bg-white/10 border border-white/15 rounded-lg p-2.5 mb-2.5">
                      <p className="text-[8.5px] font-bold uppercase tracking-wider text-white/70">
                        BANCO: <span className="text-white font-black">INBURSA</span>
                      </p>
                      <p className="text-[8px] uppercase tracking-wider text-[#dfb76c] font-bold mt-1">
                        CLABE INTERBANCARIA
                      </p>
                      <p className="text-xs font-mono font-black text-white tracking-widest mt-0.5 select-all">
                        036650500395989048
                      </p>
                    </div>

                    {/* Bank 2: Banco del Bajío */}
                    <div className="bg-white/10 border border-white/15 rounded-lg p-2.5">
                      <p className="text-[8.5px] font-bold uppercase tracking-wider text-white/70">
                        BANCO: <span className="text-white font-black">BANCO DEL BAJÍO</span>
                      </p>
                      <p className="text-[8px] uppercase tracking-wider text-[#dfb76c] font-bold mt-1">
                        CLABE INTERBANCARIA
                      </p>
                      <p className="text-xs font-mono font-black text-white tracking-widest mt-0.5 select-all">
                        030650900014356383
                      </p>
                    </div>
                  </div>

                  {/* Reference indicator badge */}
                  <div className="mt-3 bg-[#dfb76c]/15 border border-[#dfb76c]/30 rounded-lg p-2 text-center text-[9px] text-[#dfb76c] font-bold">
                    Referencia obligatoria: {area.name} (número de propiedad)
                  </div>
                </div>
              </div>

              {/* Legal disclaimer */}
              <div className="pt-4 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Este comprobante es un estado de cuenta interno y no tiene validez fiscal
                </p>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
