import Link from "next/link";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";

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
        <div className="rounded-3xl border border-[#cdb39a]/50 bg-[#fff8ef] p-8 text-center shadow-[0_16px_34px_rgba(43,28,20,0.12)]">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Listado pagos</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2d2018]">ID invalido</h1>
          <p className="mt-3 text-sm text-[#604f42]">
            Para abrir esta pantalla necesitas enviar un identificador valido.
          </p>
          <Link
            href="/areas-privativas"
            className="mt-5 inline-flex rounded-full border border-[#2b211d]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b211d] transition hover:border-[#2b211d] hover:bg-[#2b211d] hover:text-[#fff7ec]"
          >
            Volver a Areas Privativas
          </Link>
        </div>
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
        <div className="rounded-3xl border border-[#cdb39a]/50 bg-[#fff8ef] p-8 text-center shadow-[0_16px_34px_rgba(43,28,20,0.12)]">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Listado pagos</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2d2018]">Area no encontrada</h1>
          <p className="mt-3 text-sm text-[#604f42]">
            No encontramos una Area Privativa con ese identificador.
          </p>
          <Link
            href="/areas-privativas"
            className="mt-5 inline-flex rounded-full border border-[#2b211d]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b211d] transition hover:border-[#2b211d] hover:bg-[#2b211d] hover:text-[#fff7ec]"
          >
            Volver a Areas Privativas
          </Link>
        </div>
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

  const tabClasses = (isActive: boolean) =>
    isActive
      ? "rounded-full border border-[#7f4e34] bg-[#7f4e34] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#fff8ef]"
      : "rounded-full border border-[#7f4e34]/35 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b442f] transition hover:bg-[#f6ebdf]";

  return (
    <PrivateAreaActionShell
      area={area}
      title={opc === "1" ? "Listado de Pagos - Comercio" : "Listado de Pagos - Propietario"}
      subtitle="Consolidado de cargos y pagos sobre el area privada, con navegacion interna y filtros por contexto legacy opc."
      activePage={opc === "1" ? "listado-pagos-comercio" : "listado-pagos-propietario"}
    >
      <section className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#2d2018]">Filtro de contexto legacy</h2>
            <p className="mt-1 text-sm text-[#6a594c]">
              `opc=2` para Propietario y `opc=1` para Comercio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildActionHref("listado-pagos", area.privateAreaId, "2")}
              className={tabClasses(opc === "2")}
            >
              Propietario
            </Link>
            <Link
              href={buildActionHref("listado-pagos", area.privateAreaId, "1")}
              className={tabClasses(opc === "1")}
            >
              Comercio
            </Link>
          </div>
        </div>

        {didFallbackToAllCharges ? (
          <div className="mt-3 rounded-2xl border border-[#d8c7b5] bg-[#fffdf9] px-3 py-2 text-sm text-[#6b5a4d]">
            No se detectaron cargos especificos para este contexto; se muestran todos los cargos del area.
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-[#cfb8a1] bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a6247]">Total cargado</p>
            <p className="mt-1 text-2xl font-semibold text-[#2f221a]">{formatCurrency(totalCharged)}</p>
          </article>
          <article className="rounded-2xl border border-[#cfb8a1] bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a6247]">Total pagado</p>
            <p className="mt-1 text-2xl font-semibold text-[#2f221a]">{formatCurrency(totalPaid)}</p>
          </article>
          <article className="rounded-2xl border border-[#cfb8a1] bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a6247]">Saldo</p>
            <p className="mt-1 text-2xl font-semibold text-[#2f221a]">{formatCurrency(totalBalance)}</p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <h3 className="text-lg font-semibold text-[#2d2018]">Cargos</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#7a553f]">
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Periodo</th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Grupo</th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Cargo</th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Pagado</th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Saldo</th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Vence</th>
                </tr>
              </thead>
              <tbody>
                {visibleChargeLines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-[#6a594c]">
                      No hay cargos registrados para esta area.
                    </td>
                  </tr>
                ) : (
                  visibleChargeLines.map((charge) => (
                    <tr key={charge.id} className="odd:bg-[#f9f4ec] even:bg-[#f5ede3]">
                      <td className="border-b border-[#e0d2c2] px-3 py-2">
                        {periodLabel(charge.periodYear, charge.periodMonth)}
                      </td>
                      <td className="border-b border-[#e0d2c2] px-3 py-2">{charge.chargeGroupName}</td>
                      <td className="border-b border-[#e0d2c2] px-3 py-2">{formatCurrency(charge.amount)}</td>
                      <td className="border-b border-[#e0d2c2] px-3 py-2">{formatCurrency(charge.paidAmount)}</td>
                      <td className="border-b border-[#e0d2c2] px-3 py-2">{formatCurrency(charge.balanceAmount)}</td>
                      <td className="border-b border-[#e0d2c2] px-3 py-2">{formatDate(charge.dueDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <h3 className="text-lg font-semibold text-[#2d2018]">Pagos aplicados</h3>
          <div className="mt-4 space-y-3">
            {visiblePaymentMovements.length === 0 ? (
              <div className="rounded-2xl border border-[#d8c7b5] bg-[#fffdf9] px-3 py-4 text-sm text-[#6a594c]">
                No hay pagos asociados a los cargos visibles.
              </div>
            ) : (
              visiblePaymentMovements.map((payment) => (
                <article
                  key={payment.paymentId}
                  className="rounded-2xl border border-[#d8c7b5] bg-[#fffdf9] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#2f221a]">{formatDate(payment.paidAt)}</p>
                    <span className="rounded-full border border-[#d9c9b8] bg-[#fff8ef] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#8b6a52]">
                      {payment.method}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#6b5a4d]">Referencia: {payment.reference ?? "-"}</p>
                  <p className="mt-1 text-xs text-[#6b5a4d]">Notas: {payment.notes ?? "-"}</p>
                  <p className="mt-2 text-sm font-semibold text-[#2f221a]">
                    Aplicado: {formatCurrency(payment.allocatedAmount)}
                  </p>
                  <p className="text-xs text-[#6b5a4d]">
                    Monto pago: {formatCurrency(payment.paymentTotalAmount)}
                  </p>
                </article>
              ))
            )}
          </div>
        </article>
      </section>
    </PrivateAreaActionShell>
  );
}
