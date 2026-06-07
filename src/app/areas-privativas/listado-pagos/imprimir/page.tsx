import Link from "next/link";
import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";
import { prisma } from "@/shared/infrastructure/db/prisma";
import {
  type ActionPageSearchParams,
  formatCurrency,
  formatDate,
  parseOpc,
  resolvePrivateAreaReference,
} from "../../_lib/private-area-action-routing";
import { PrintTrigger } from "./_components/print-trigger";

type PageProps = {
  searchParams?: Promise<ActionPageSearchParams>;
};



export default async function ImprimirEstadoCuentaPage({ searchParams }: PageProps) {
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

  // Fetch all charges with allocations and payments
  const dbCharges = await prisma.charge.findMany({
    where: {
      privateAreaId: area.privateAreaId,
    },
    orderBy: [
      { periodYear: "asc" },
      { periodMonth: "asc" },
    ],
    include: {
      chargeGroup: true,
      allocations: {
        include: {
          payment: true,
        },
      },
    },
  });

  // opc=1 → Propietario (OWNER), opc=2 → Comercio (COMMERCE) — matches legacy id_opcion_estado_cuenta
  const targetResponsibility = opc === "2" ? "COMMERCE" : "OWNER";

  // Filter charges by responsibility
  const commerceFilteredCharges = dbCharges.filter((c) =>
    c.responsibility === targetResponsibility,
  );

  const finalCharges = commerceFilteredCharges.length > 0 ? commerceFilteredCharges : dbCharges;

  // Map to rich client objects
  const mappedCharges = finalCharges.map((c) => {
    const amount = Number(c.amount);
    const interestAmount = Number(c.interestAmount);
    const discountAmount = Number(c.discountAmount);
    const paidAmount = c.allocations.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
    const balanceAmount = amount - paidAmount + interestAmount - discountAmount;

    // Retrieve unique paid dates from allocations
    const paidDatesList = c.allocations
      .map((alloc) => alloc.payment.paidAt)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      id: c.id,
      periodYear: c.periodYear,
      periodMonth: c.periodMonth,
      dueDate: c.dueDate,
      concept: c.concept,
      chargeGroupName: c.chargeGroup.name,
      chargeGroupType: c.chargeGroup.chargeType,
      amount,
      interestAmount,
      discountAmount,
      paidAmount,
      balanceAmount,
      paidDatesList,
    };
  });

  // Build list of payments
  const paymentMovementsById = new Map<string, {
    paymentId: string;
    paidAt: Date;
    method: string;
    reference: string | null;
    paymentTotalAmount: number;
  }>();

  for (const c of finalCharges) {
    for (const alloc of c.allocations) {
      const p = alloc.payment;
      paymentMovementsById.set(p.id, {
        paymentId: p.id,
        paidAt: p.paidAt,
        method: p.method,
        reference: p.reference,
        paymentTotalAmount: Number(p.amount),
      });
    }
  }

  // Fetch independent incomes
  const dbIncomes = await prisma.income.findMany({
    where: {
      privateAreaId: area.privateAreaId,
      isActive: true,
    },
    orderBy: { date: "desc" },
  });

  for (const inc of dbIncomes) {
    if (!paymentMovementsById.has(inc.id)) {
      paymentMovementsById.set(inc.id, {
        paymentId: inc.id,
        paidAt: inc.date,
        method: inc.paymentMethod || "OTHER",
        reference: inc.concept,
        paymentTotalAmount: Number(inc.amount),
      });
    }
  }

  const chronologicalPayments = Array.from(paymentMovementsById.values()).sort(
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

  const formatPeriodMonth = (m: number) => {
    const months = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];
    return months[m - 1] || "";
  };

  return (
    <div className="bg-white text-black min-h-screen p-6 font-sans text-[12px] leading-relaxed max-w-[900px] mx-auto print:p-0">
      <PrintTrigger />

      {/* Top Bar Subtitle */}
      <div className="flex justify-between items-center text-[10px] text-gray-500 border-b border-gray-100 pb-2 mb-6">
        <span>{formatDate(new Date())}</span>
        <span className="font-semibold uppercase tracking-wider">Sistema Condominal | Impresión</span>
        <span>Pág. 1</span>
      </div>

      {/* Header section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-black">Estado de cuenta</h1>
        </div>
        <div>
          <img 
            src="/brand/valquirico-logo-light.png" 
            alt="Val'Quirico Logo" 
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>

      {/* Info Card */}
      <div className="max-w-[320px] border border-gray-300 rounded-lg p-3 mb-6 bg-white">
        <table className="w-full text-[11px]">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-1 text-gray-500">Área privativa:</td>
              <td className="py-1 text-right font-bold text-black">{area.name}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 text-gray-500">M2:</td>
              <td className="py-1 text-right font-bold text-black">{displayM2.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 text-gray-500">Nombre:</td>
              <td className="py-1 text-right font-bold text-black">{contactUser?.name || "—"}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 text-gray-500">Email:</td>
              <td className="py-1 text-right font-bold text-black break-all">{contactUser?.email || "—"}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-500">Teléfono:</td>
              <td className="py-1 text-right font-bold text-black">{contactUser?.phone || "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Debe al día Card */}
        <div>
          <div className="border border-gray-300 rounded-lg p-3 bg-white text-center mb-3">
            <div className="flex justify-around items-center">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Debe al día</p>
                <p className="text-lg font-extrabold text-black mt-1">{formatCurrency(totalBalance)}</p>
              </div>
              <div className="border-l border-gray-200 h-8"></div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Saldo a favor</p>
                <p className="text-lg font-extrabold text-black mt-1">$0.00</p>
              </div>
            </div>
          </div>
          {/* Breakdown */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-[10px]">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Saldo inicial:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">$0.00</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Cuotas ordinarias:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(ordinariasBalance)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Cuotas extraordinarias - Condóminos:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(extraordinariasCondominosBalance)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Cuotas STC:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(stcBalance)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Sanción:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(sancionBalance)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Cuota extraordinaria - Comercios:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(extraordinariaComerciosBalance)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Comodato:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(comodatoBalance)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 text-gray-500">Intereses moratorios:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(interesesBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cargos Totales Card */}
        <div>
          <div className="border border-gray-300 rounded-lg p-3 bg-white text-center mb-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Cargos totales</p>
            <p className="text-lg font-extrabold text-black mt-1">{formatCurrency(totalCargosCard)}</p>
          </div>
          {/* Breakdown */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-[10px]">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Saldo inicial:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">$0.00</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Cuotas ordinarias:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(ordinariasCharged)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Cuotas extraordinarias - Condóminos:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(extraordinariasCondominosCharged)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Cuotas STC:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(stcCharged)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Sanción:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(sancionCharged)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Cuota extraordinaria - Comercios:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(extraordinariaComerciosCharged)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Comodato:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(comodatoCharged)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">Intereses moratorios:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(totalInterestsCharged)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 text-gray-500">Descuentos:</td>
                  <td className="px-3 py-1.5 text-right font-bold text-black">{formatCurrency(totalDiscounts)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ultimos Pagos Section */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-black uppercase tracking-wider mb-2">Últimos pagos realizados</h2>
        <div className="border border-sky-100 rounded-lg overflow-hidden">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-sky-50 text-slate-700 font-bold border-b border-sky-100">
                <th className="py-2 px-3 text-left w-1/3">Folio</th>
                <th className="py-2 px-3 text-left w-1/3">Fecha real de cobro</th>
                <th className="py-2 px-3 text-right w-1/3">Abono realizado</th>
              </tr>
            </thead>
            <tbody>
              {chronologicalPayments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-center text-gray-400 italic">No hay pagos registrados</td>
                </tr>
              ) : (
                chronologicalPayments.map((p) => (
                  <tr key={p.paymentId} className="border-b border-sky-50 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-bold text-black">{p.reference || p.paymentId.substring(0, 8)}</td>
                    <td className="py-2 px-3 text-gray-600">{formatDate(p.paidAt)}</td>
                    <td className="py-2 px-3 text-right font-bold text-black">{formatCurrency(p.paymentTotalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="mb-8">
        <div className="border border-sky-100 rounded-lg overflow-hidden">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-sky-50 text-slate-700 font-bold border-b border-sky-100">
                <th className="py-2 px-2 text-left">Tipo de cuota</th>
                <th className="py-2 px-2 text-left">Concepto</th>
                <th className="py-2 px-2 text-left">Fecha de cobro</th>
                <th className="py-2 px-2 text-left">Fecha límite de pago</th>
                <th className="py-2 px-2 text-left">Pagado el</th>
                <th className="py-2 px-2 text-right">Cargo</th>
                <th className="py-2 px-2 text-right">Abono</th>
                <th className="py-2 px-2 text-right">Intereses moratorios</th>
                <th className="py-2 px-2 text-right">Descuento</th>
                <th className="py-2 px-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {mappedCharges.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-4 px-3 text-center text-gray-400 italic">No hay cargos registrados</td>
                </tr>
              ) : (
                mappedCharges.map((c) => {
                  const paidDates = c.paidDatesList.length > 0 
                    ? c.paidDatesList.map(date => formatDate(date)).join(" / ")
                    : "—";

                  return (
                    <tr key={c.id} className="border-b border-sky-50 last:border-0 hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-gray-700">{c.chargeGroupName}</td>
                      <td className="py-2 px-2 text-gray-700">{c.concept || `${c.chargeGroupName} ${c.periodYear}`}</td>
                      <td className="py-2 px-2 text-gray-600">
                        01 {formatPeriodMonth(c.periodMonth)} {c.periodYear.toString().slice(-2)}
                      </td>
                      <td className="py-2 px-2 text-gray-600">{c.dueDate ? formatDate(c.dueDate) : "—"}</td>
                      <td className="py-2 px-2 text-gray-500 font-medium">{paidDates}</td>
                      <td className="py-2 px-2 text-right font-bold text-black">{formatCurrency(c.amount)}</td>
                      <td className="py-2 px-2 text-right text-black">{formatCurrency(c.paidAmount)}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{formatCurrency(c.interestAmount)}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{formatCurrency(c.discountAmount)}</td>
                      <td className="py-2 px-2 text-right font-bold text-black">{formatCurrency(c.balanceAmount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Instructions / Banks */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start mt-6 print:mt-10 border-t border-gray-100 pt-6">
        {/* Left Instruction Box */}
        <div className="md:col-span-8 border border-gray-400 rounded-lg p-3 bg-white text-[9.5px] text-gray-800 space-y-2">
          <p className="font-bold text-black">Estimado Condómino le recordamos que:</p>
          <p>
            La fecha de pago de la cuota ordinaria condominal son los primeros 7 días hábiles del mes, a partir del día 8 genera interés moratorio establecido en el reglamento general de condóminos artículo 3.9 (mora en los pagos).
          </p>
          <p>
            <span className="font-bold text-black">Nombre o razón social:</span> ADMINISTRADORA VALQUIRICO A.C. <span className="font-bold text-black">RFC:</span> AVA1706221G3
          </p>
          <div className="space-y-0.5 mt-2">
            <p className="font-bold text-black">Nota:</p>
            <p>1. solo se aceptarán pagos mediante transferencia, terminal bancaria (oficinas de administración) y pagos domiciliados.</p>
            <p>2. No se aceptan depósitos en efectivo en cuenta bancaria.</p>
            <p>
              3. Los comprobantes de pago deberán estar identificados mediante el concepto VQ# (Numero de propiedad), Tipo de Cuota Ordinaria o Extraordinaria y el mes o año que está pagando, ejemplo VQ#001, Cuota Ordinaria Jul 2025.
            </p>
            <p>4. Pagos no identificados no se reflejarán oportunamente.</p>
          </div>
        </div>

        {/* Right Bank details Box */}
        <div className="md:col-span-4 text-[10px] space-y-3">
          <div>
            <p className="font-bold text-black">Banco: INBURSA</p>
            <p className="text-gray-700">Clabe interbancaria: <span className="font-bold">036650500395989048</span></p>
          </div>
          <div>
            <p className="font-bold text-black">Banco: BANCO DEL BAJIO</p>
            <p className="text-gray-700">Clabe interbancaria: <span className="font-bold">030650900014356383</span></p>
          </div>
          <div className="pt-4 text-center md:text-left">
            <p className="font-bold text-gray-400 uppercase tracking-wide text-[9px]">Este comprobante no tiene validez fiscal.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
