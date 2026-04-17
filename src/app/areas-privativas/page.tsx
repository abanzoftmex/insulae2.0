import type { Metadata } from "next";
import Link from "next/link";
import { Lora, Nunito_Sans } from "next/font/google";
import type { ReactNode } from "react";

import {
  getPrivateAreaLegacyActionsUseCase,
  type PrivateAreaLegacyAction,
} from "@/modules/private-area-actions";
import { getPrivateAreaListingUseCase } from "@/modules/private-areas";
import { toPrivateAreaListingVM } from "@/modules/private-areas/presentation/private-area-listing.vm";
import { StickyHorizontalTableFrame } from "./_components/sticky-horizontal-table-frame";

const lora = Lora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-private-display",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-private-body",
});

export const metadata: Metadata = {
  title: "Areas Privativas | Insulae 2.0",
  description:
    "Vista grande de Areas Privativas con resumen operativo, filtros avanzados y tabla extensiva en estructura hexagonal.",
};

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function pickParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function renderPartyContacts(
  contacts: Array<{ name: string; email: string | null; phone: string | null }>,
): ReactNode {
  if (contacts.length === 0) {
    return <span className="text-[#8a7869]">-</span>;
  }

  return (
    <div className="space-y-1">
      {contacts.map((contact, index) => (
        <div key={`${contact.name}-${contact.email ?? ""}-${contact.phone ?? ""}-${index}`}>
          <p className="font-semibold text-[#2f241d]">{contact.name}</p>
          <p className="text-[11px] text-[#67574b]">
            {contact.email ?? "sin correo"} · {contact.phone ?? "sin telefono"}
          </p>
        </div>
      ))}
    </div>
  );
}

function renderFinancialCards(
  ownerAmount: string,
  commerceAmount: string,
  showCommerce: boolean,
): ReactNode {
  return (
    <div className="space-y-1">
      <div className="rounded-md border border-[#a7bee8] bg-[#c8d7ee] px-2 py-1">
        <p className="text-[11px] text-[#4a5a72]">Propietario:</p>
        <p className="text-sm font-semibold text-[#2f3d52]">{ownerAmount}</p>
      </div>
      {showCommerce ? (
        <div className="rounded-md border border-[#e0c44a] bg-[#f3e9c5] px-2 py-1">
          <p className="text-[11px] text-[#6c5d2c]">Comercio:</p>
          <p className="text-sm font-semibold text-[#4d3f16]">{commerceAmount}</p>
        </div>
      ) : null}
    </div>
  );
}

function renderActionGlyph(actionId: PrivateAreaLegacyAction["id"]): ReactNode {
  if (actionId === "EDIT_BASE") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
        <path d="M14.7 2.3a2.1 2.1 0 0 1 3 3l-9 9a1 1 0 0 1-.4.3l-3.7 1.1a.6.6 0 0 1-.8-.8l1.1-3.7a1 1 0 0 1 .3-.4l9-9Zm1.7 1.3a.9.9 0 0 0-1.3 0l-1 1 1.3 1.3 1-1a.9.9 0 0 0 0-1.3ZM13.3 5.7l-7.9 7.9-.6 2 2-.6 7.9-7.9-1.4-1.4Z" />
      </svg>
    );
  }

  if (actionId === "EDIT_IMAGES") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
        <path d="M4 3.5A2.5 2.5 0 0 0 1.5 6v8A2.5 2.5 0 0 0 4 16.5h12a2.5 2.5 0 0 0 2.5-2.5V6A2.5 2.5 0 0 0 16 3.5H4Zm0 1.2h12c.7 0 1.3.6 1.3 1.3v5.2l-2.3-2.3a1 1 0 0 0-1.4 0L8 14.5H4c-.7 0-1.3-.6-1.3-1.3V6c0-.7.6-1.3 1.3-1.3Zm10.6 1.9a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM4 15.3l4.7-4.7 3.1 3.1.2.2H4Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5V7h1a1 1 0 1 1 0 2h-1v5.5A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5V9H2a1 1 0 1 1 0-2h1V4.5Zm1.2 0V7h11.6V4.5a.3.3 0 0 0-.3-.3h-11a.3.3 0 0 0-.3.3Zm0 3.7v6.3c0 .2.1.3.3.3h11c.2 0 .3-.1.3-.3V8.2H4.2Z" />
    </svg>
  );
}

function renderLegacyAction(action: PrivateAreaLegacyAction): ReactNode {
  const isIconAction = action.kind === "icon";
  const enabledClasses = isIconAction
    ? "border-[#ae7f24] bg-[#c8942a] text-[#fff7e8] hover:brightness-110"
    : "border-[#ae7f24] bg-[#c8942a] text-[#fff7e8] hover:brightness-110";
  const disabledClasses = isIconAction
    ? "cursor-not-allowed border-[#d2c3a6] bg-[#efe4d2] text-[#a69480]"
    : "cursor-not-allowed border-[#d2c3a6] bg-[#efe4d2] text-[#a69480]";
  const sharedClasses = isIconAction
    ? "inline-flex h-6 w-6 items-center justify-center rounded-md border transition"
    : "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold transition";

  if (!action.isEnabled || !action.href) {
    return (
      <span
        key={action.id}
        title={action.label}
        aria-disabled="true"
        className={`${sharedClasses} ${disabledClasses}`}
      >
        {isIconAction ? renderActionGlyph(action.id) : action.label}
      </span>
    );
  }

  return (
    <a
      key={action.id}
      href={action.href}
      title={action.label}
      className={`${sharedClasses} ${enabledClasses}`}
    >
      {isIconAction ? renderActionGlyph(action.id) : action.label}
    </a>
  );
}

export default async function AreasPrivativasPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const query = pickParam(params.q) ?? "";
  const useType = pickParam(params.useType) ?? "";
  const status = pickParam(params.status) ?? "ALL";
  const m2Min = parseNumber(pickParam(params.m2Min));
  const m2Max = parseNumber(pickParam(params.m2Max));
  const showFullTable = true;
  const page = parsePositiveInteger(pickParam(params.page), 1);
  const pageSize = Math.max(30, parsePositiveInteger(pickParam(params.pageSize), 30));

  const listing = await getPrivateAreaListingUseCase.execute({
    query,
    useType,
    status,
    m2Min,
    m2Max,
    page,
    pageSize,
  });

  if (!listing) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-6 py-20">
        <div className="rounded-3xl border border-[#cdb39a]/50 bg-[#fff8ef] p-8 text-center shadow-[0_16px_34px_rgba(43,28,20,0.12)]">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Areas Privativas</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2d2018]">Sin datos disponibles</h1>
          <p className="mt-3 text-sm text-[#604f42]">
            No se encontro un condominio activo para construir la vista.
          </p>
        </div>
      </main>
    );
  }

  const legacyActionsByPrivateAreaId =
    await getPrivateAreaLegacyActionsUseCase.execute(
      listing.rows.map((row) => ({
        privateAreaId: row.id,
        isActive: row.isActive,
        hierarchyRole: row.hierarchyRole,
      })),
    );

  const vm = toPrivateAreaListingVM(listing);
  const legacyOrdinaryYear = new Date().getFullYear() - 1;
  const nextLegacyOrdinaryYear = legacyOrdinaryYear + 1;
  const extraordinaryRangeLabel = `${legacyOrdinaryYear - 1}-${legacyOrdinaryYear}`;
  const shortMonthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthLabels = [
    ...shortMonthLabels.map((label, index) => ({
      label: `${label} ${legacyOrdinaryYear}`,
      key: `month_${legacyOrdinaryYear}_${index + 1}`,
    })),
    ...shortMonthLabels.map((label, index) => ({
      label: `${label} ${nextLegacyOrdinaryYear}`,
      key: `month_${nextLegacyOrdinaryYear}_${index + 1}`,
    })),
  ];

  const fullColumnWidths = [
    170,
    145,
    250,
    170,
    170,
    170,
    140,
    170,
    170,
    170,
    190,
    170,
    140,
    170,
    130,
    170,
    170,
    190,
    190,
    170,
    190,
    190,
    170,
    210,
    210,
    210,
    210,
    160,
    170,
    160,
    170,
    160,
    170,
    170,
    ...Array(monthLabels.length).fill(120),
    230,
    230,
    230,
    230,
    230,
    230,
    230,
  ];
  const fullTableColumnCount = fullColumnWidths.length;
  const compactTableColumnCount = 7;
  const fullTableWidth = fullColumnWidths.reduce((total, width) => total + width, 0);
  const stickyLeftActions = 0;
  const stickyLeftLocation = fullColumnWidths[0];
  const stickyLeftPrivateArea = fullColumnWidths[0] + fullColumnWidths[1];

  const buildHref = (nextPage: number) => {
    const url = new URLSearchParams();

    if (vm.filters.query) {
      url.set("q", vm.filters.query);
    }
    if (vm.filters.useType) {
      url.set("useType", vm.filters.useType);
    }
    if (vm.filters.status && vm.filters.status !== "ALL") {
      url.set("status", vm.filters.status);
    }
    if (vm.filters.m2Min) {
      url.set("m2Min", vm.filters.m2Min);
    }
    if (vm.filters.m2Max) {
      url.set("m2Max", vm.filters.m2Max);
    }

    url.set("pageSize", String(vm.pagination.pageSize));
    url.set("page", String(nextPage));

    const queryString = url.toString();
    return queryString.length > 0 ? `/areas-privativas?${queryString}` : "/areas-privativas";
  };

  return (
    <main
      className={`${lora.variable} ${nunito.variable} relative isolate min-h-screen bg-[#f2ece4] px-5 pb-14 pt-8 text-[#1f1713] sm:px-8 lg:px-12`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-8rem] h-[24rem] w-[24rem] rounded-full bg-[#8b5238]/14 blur-3xl" />
        <div className="absolute right-[-8rem] top-[8rem] h-[22rem] w-[22rem] rounded-full bg-[#4f7664]/13 blur-3xl" />
      </div>

      <section className="relative mx-auto flex w-full min-w-0 max-w-[1500px] flex-col gap-6">
        <header className="rounded-[2rem] border border-[#bfaa93]/45 bg-[#fff7eb]/88 p-6 shadow-[0_18px_45px_rgba(43,27,17,0.12)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex rounded-full border border-[#7b4f38]/35 bg-[#7b4f38]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#73452e]">
              Fases 1-4
            </span>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/listado-seguridad"
                className="rounded-full border border-[#2b211d]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b211d] transition hover:border-[#2b211d] hover:bg-[#2b211d] hover:text-[#fff7ec]"
              >
                Listado seguridad
              </Link>
              <Link
                href="/reporte-condominio"
                className="rounded-full border border-[#2b211d]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b211d] transition hover:border-[#2b211d] hover:bg-[#2b211d] hover:text-[#fff7ec]"
              >
                Ir a reporte
              </Link>
              <Link
                href="/condominio"
                className="rounded-full border border-[#2b211d]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b211d] transition hover:border-[#2b211d] hover:bg-[#2b211d] hover:text-[#fff7ec]"
              >
                Ir a condominio
              </Link>
            </div>
          </div>

          <h1 className="mt-4 font-[var(--font-private-display)] text-4xl leading-none text-[#2c2019] sm:text-5xl">
            Areas Privativas
          </h1>
          <p className="mt-3 max-w-4xl font-[var(--font-private-body)] text-sm leading-relaxed text-[#5a4b40] sm:text-base">
            Vista grande para operacion diaria: inventario de areas, superficies, uso de suelo,
            estimaciones de cuota ordinaria y saldo actual. Esta fase agrega base de jerarquia y estado legacy de forma incremental.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#7e5741]">
            Ultima actualizacion consolidada: {vm.updatedAtLabel}
          </p>
        </header>

        <section className="rounded-[1.75rem] border border-[#bea894]/55 bg-[linear-gradient(180deg,#fffdf8_0%,#f6ece0_100%)] p-4 shadow-[0_20px_42px_rgba(41,27,19,0.11)] sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-[#cfb8a2]/70 pb-3">
            <h2 className="font-[var(--font-private-display)] text-2xl leading-none text-[#2b1f18] sm:text-3xl">
              Comparador
            </h2>
            <span className="rounded-full border border-[#9d6b4f]/35 bg-[#9d6b4f]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7c4d34]">
              Legacy
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <article className="rounded-2xl border border-[#c8b39d]/70 bg-[#fffaf3] shadow-[0_8px_20px_rgba(36,23,16,0.08)]">
              <dl className="divide-y divide-[#d8c6b2] text-sm">
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-[#5d4a3f]">Areas privativas / lotes totales:</dt>
                  <dd className="font-semibold text-[#2f241d]">{vm.summary.projectTotalApoles}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-[#5d4a3f]">M2 de Areas privativas / lotes totales:</dt>
                  <dd className="font-semibold text-[#2f241d]">{vm.summary.projectTotalM2}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-[#5d4a3f]">M2 de Areas comunes del condominio:</dt>
                  <dd className="font-semibold text-[#2f241d]">{vm.summary.projectCommonAreasM2}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-[#c8b39d]/70 bg-[#fffaf3] shadow-[0_8px_20px_rgba(36,23,16,0.08)]">
              <dl className="divide-y divide-[#d8c6b2] text-sm">
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-[#5d4a3f]">Areas privativas / lotes:</dt>
                  <dd className="font-semibold text-[#2f241d]">{vm.summary.legacyLots}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-[#5d4a3f]">M2 de Areas privativas / lotes:</dt>
                  <dd className="font-semibold text-[#2f241d]">{vm.summary.legacyLotsM2}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-[#5d4a3f]">M2 de Areas comunes del condominio:</dt>
                  <dd className="font-semibold text-[#2f241d]">{vm.summary.projectCommonAreasM2}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-[#c8b39d]/70 bg-[#fffaf3] shadow-[0_8px_20px_rgba(36,23,16,0.08)]">
              <dl className="divide-y divide-[#d8c6b2] text-sm">
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-[#5d4a3f]">Areas privativas / lotes disponibles:</dt>
                  <dd className="font-semibold text-[#2f241d]">{vm.summary.legacyAvailableLots}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-[#5d4a3f]">Areas privativas / lotes construidos :</dt>
                  <dd className="font-semibold text-[#2f241d]">{vm.summary.legacyBuiltLots}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-[#5d4a3f]">Fracciones de Areas privativas:</dt>
                  <dd className="font-semibold text-[#2f241d]">{vm.summary.legacyFractions}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-[#5d4a3f]">Fusiones de Areas privativas / lotes:</dt>
                  <dd className="font-semibold text-[#2f241d]">{vm.summary.legacyFusionLots}</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <section className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/88 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" method="get">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f583f]">
              Buscar
              <input
                type="text"
                name="q"
                defaultValue={vm.filters.query}
                placeholder="Nombre, codigo, zona, uso"
                className="rounded-xl border border-[#cfb8a1] bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#2d241f]"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f583f]">
              Uso de suelo
              <select
                name="useType"
                defaultValue={vm.filters.useType}
                className="rounded-xl border border-[#cfb8a1] bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#2d241f]"
              >
                <option value="">Todos</option>
                {vm.facets.useTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f583f]">
              Estatus
              <select
                name="status"
                defaultValue={vm.filters.status}
                className="rounded-xl border border-[#cfb8a1] bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#2d241f]"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f583f]">
              m2 min
              <input
                type="number"
                name="m2Min"
                step="0.01"
                defaultValue={vm.filters.m2Min}
                className="rounded-xl border border-[#cfb8a1] bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#2d241f]"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f583f]">
              m2 max
              <input
                type="number"
                name="m2Max"
                step="0.01"
                defaultValue={vm.filters.m2Max}
                className="rounded-xl border border-[#cfb8a1] bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#2d241f]"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f583f]">
              Tamano pagina
              <select
                name="pageSize"
                defaultValue={vm.filters.pageSize}
                className="rounded-xl border border-[#cfb8a1] bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#2d241f]"
              >
                <option value="30">30</option>
                <option value="50">50</option>
                <option value="80">80</option>
              </select>
            </label>

            <input type="hidden" name="page" value="1" />
            <div className="md:col-span-2 xl:col-span-6 flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                className="rounded-xl border border-[#70452e] bg-[#70452e] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#fff7ed] transition hover:brightness-110"
              >
                Aplicar filtros
              </button>
              <Link
                href="/areas-privativas"
                className="rounded-xl border border-[#6e5a4a]/45 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#4f4036] transition hover:bg-[#f5ede4]"
              >
                Limpiar
              </Link>
              <span className="self-center text-xs uppercase tracking-[0.14em] text-[#7f6554]">
                Resultados: {vm.pagination.totalRows}
              </span>
            </div>
          </form>
        </section>

        <section className="w-full min-w-0">
          <div className="my-[5px] block w-full rounded-[10px] bg-[#fff9f1] p-[6px] shadow-sm">
            {showFullTable ? (
              <StickyHorizontalTableFrame
                header={
                  <table
                    className="table-fixed border-separate border-spacing-0"
                    style={{ width: `${fullTableWidth}px` }}
                  >
                    <colgroup>
                      {fullColumnWidths.map((width, index) => (
                        <col key={`header-col-${index}`} style={{ width: `${width}px` }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr className="bg-[#d8c6af] text-left text-[11px] uppercase tracking-[0.1em] text-[#382820]">
                        <th
                          className="sticky left-0 z-[72] min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3"
                          style={{ left: stickyLeftActions }}
                        >
                          Acciones
                        </th>
                        <th
                          className="sticky z-[71] min-w-[145px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3"
                          style={{ left: stickyLeftLocation }}
                        >
                          Ubicacion
                        </th>
                        <th
                          className="sticky z-[70] min-w-[250px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3"
                          style={{ left: stickyLeftPrivateArea }}
                        >
                          Area privativa / fraccion
                        </th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Jerarquia</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Superficie m2 area privativa actualizado</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Superficie m2 area privativa original</th>
                        <th className="min-w-[140px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Indiviso del area privativa</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">m2 Areas comunes del condominio</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">m2 Totales area privativa</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">m2 de construccion AP/FAP</th>
                        <th className="min-w-[190px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">m2 Areas comunes subcondominio</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">m2 Totales FAP</th>
                        <th className="min-w-[140px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">% Indiviso FAP</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Indiviso FAP/Condominio</th>
                        <th className="min-w-[130px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Uso de suelo</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cartera vencida 2017-2024</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Pago Anticipado {legacyOrdinaryYear - 1}</th>
                        <th className="min-w-[190px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuotas ordinarias {legacyOrdinaryYear} (anual)</th>
                        <th className="min-w-[190px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuotas ordinarias {legacyOrdinaryYear} (mensual)</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuotas ordinarias {legacyOrdinaryYear} (saldo actual)</th>
                        <th className="min-w-[190px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuotas ordinarias {nextLegacyOrdinaryYear} (anual)</th>
                        <th className="min-w-[190px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuotas ordinarias {nextLegacyOrdinaryYear} (mensual)</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuotas ordinarias {nextLegacyOrdinaryYear} (saldo actual)</th>
                        <th className="min-w-[210px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuotas extraordinarias - Condominios {extraordinaryRangeLabel}</th>
                        <th className="min-w-[210px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuotas extraordinarias - Condominios {extraordinaryRangeLabel} (saldo actual)</th>
                        <th className="min-w-[210px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuota extraordinaria - Comercios {extraordinaryRangeLabel}</th>
                        <th className="min-w-[210px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuota extraordinaria - Comercios {extraordinaryRangeLabel} (saldo actual)</th>
                        <th className="min-w-[160px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuotas STC</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Cuotas STC (saldo actual)</th>
                        <th className="min-w-[160px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Sancion</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Sancion (saldo actual)</th>
                        <th className="min-w-[160px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Comodato</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Comodato (saldo actual)</th>
                        <th className="min-w-[170px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Saldo actual</th>
                        {monthLabels.map((month) => (
                          <th key={month.key} className="min-w-[120px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">
                            {month.label}
                          </th>
                        ))}
                        <th className="min-w-[230px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">
                          Propietario inicial (BLOCKCHAIN) Historia
                        </th>
                        <th className="min-w-[230px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Propietario legal (Esta columna es para el INIDIVISO)</th>
                        <th className="min-w-[230px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Dominio actual (Esta columna es para el ESTADO DE CUENTA)</th>
                        <th className="min-w-[230px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Dominio pleno</th>
                        <th className="min-w-[230px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Arrendatario / usuario</th>
                        <th className="min-w-[230px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">
                          Contacto administrativo del arrendamiento
                        </th>
                        <th className="min-w-[230px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">
                          Contacto operativo del arrendamiento
                        </th>
                      </tr>
                    </thead>
                  </table>
                }
              >
                <table
                  className="table-fixed border-separate border-spacing-0"
                  style={{ width: `${fullTableWidth}px` }}
                >
                  <colgroup>
                    {fullColumnWidths.map((width, index) => (
                      <col key={`body-col-${index}`} style={{ width: `${width}px` }} />
                    ))}
                  </colgroup>
                  <tbody>
                    {vm.rows.length === 0 ? (
                      <tr>
                        <td colSpan={fullTableColumnCount} className="px-6 py-10 text-center text-sm text-[#6f5c4f]">
                          No hay resultados con los filtros actuales.
                        </td>
                      </tr>
                    ) : null}

                    {vm.rows.map((row) => (
                      <tr key={row.id} className="odd:bg-[#f9f4ec] even:bg-[#f5ede3]">
                        {(() => {
                          const hasCommerceCard = row.hasRentalLabel === "Si";
                          const emptyAmount = "$0.00";
                          const renderFinancialCell = (key: string) => {
                            const split = row.financialCells[key as keyof typeof row.financialCells];
                            return renderFinancialCards(
                              split?.owner ?? emptyAmount,
                              split?.commerce ?? emptyAmount,
                              hasCommerceCard,
                            );
                          };

                          return (
                            <>
                        <td
                          className="sticky left-0 z-[42] border-b border-[#ddcebc] bg-inherit px-3 py-3"
                          style={{ left: stickyLeftActions }}
                        >
                          <div className="flex flex-wrap items-center gap-1">
                            {(legacyActionsByPrivateAreaId[row.id] ?? []).map((action) =>
                              renderLegacyAction(action),
                            )}
                          </div>
                        </td>
                        <td
                          className="sticky z-[41] border-b border-[#ddcebc] bg-inherit px-3 py-3 text-sm font-medium text-[#3a2d24]"
                          style={{ left: stickyLeftLocation }}
                        >
                          {row.zone}
                        </td>
                        <td
                          className="sticky z-[40] border-b border-[#ddcebc] bg-inherit px-3 py-3"
                          style={{ left: stickyLeftPrivateArea }}
                        >
                          <p className="truncate text-sm font-semibold text-[#2f221b]">{row.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-full border border-[#c8b39d] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6d4b36]">
                              {row.code}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                row.statusTone === "active"
                                  ? "bg-[#d4eed8] text-[#255e32]"
                                  : "bg-[#f1d6d6] text-[#7a2d2d]"
                              }`}
                            >
                              {row.statusLabel}
                            </span>
                          </div>
                        </td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">
                          <p className="font-semibold">{row.hierarchyLabel}</p>
                          <p className="text-xs text-[#6d5b4d]">Padre: {row.parentName}</p>
                        </td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.m2Updated}</td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.m2Original}</td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.indiviso}</td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.m2CommonArea}</td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm font-semibold text-[#2f241d]">
                          {row.totalAreaM2}
                        </td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.m2Construction}</td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.m2CommonAreaChildren}</td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.m2ConstructionChildren}</td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.indiviso}</td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.vccc}</td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">
                          <span className="font-semibold">{row.useTypeInitials}</span>
                          <span className="ml-1 text-[#6b594b]">({row.useType})</span>
                        </td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("arrears_2017_2024")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("advance_2024")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("ordinary_2025_annual")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("ordinary_2025_monthly")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("ordinary_2025_outstanding")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("ordinary_2026_annual")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("ordinary_2026_monthly")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("ordinary_2026_outstanding")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("extra_condo_2024_2025")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("extra_condo_2024_2025_outstanding")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("extra_commerce_2024_2025")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("extra_commerce_2024_2025_outstanding")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("stc")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("stc_outstanding")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("sancion")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("sancion_outstanding")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("comodato")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("comodato_outstanding")}</td>
                        <td className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">{renderFinancialCell("total_outstanding")}</td>
                        {monthLabels.map((month) => (
                          <td key={`${row.id}-${month.key}`} className="border-b border-[#ddcebc] px-2 py-2 text-sm text-[#382d25]">
                            {renderFinancialCell(month.key)}
                          </td>
                        ))}
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">
                          {renderPartyContacts(row.ownerInitialHistory)}
                        </td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">
                          {renderPartyContacts(row.ownerLegal)}
                        </td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">
                          {renderPartyContacts(row.domainCurrent)}
                        </td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">
                          {renderPartyContacts(row.domainFull)}
                        </td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">
                          {renderPartyContacts(row.tenantUsers)}
                        </td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">
                          {renderPartyContacts(row.rentalAdministrativeContacts)}
                        </td>
                        <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">
                          {renderPartyContacts(row.rentalOperationalContacts)}
                        </td>
                            </>
                          );
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </StickyHorizontalTableFrame>
            ) : (
              <table className="w-full table-fixed border-separate border-spacing-0">
                <thead>
                  <tr className="sticky top-0 z-30 bg-[#d8c6af] text-left text-[11px] uppercase tracking-[0.1em] text-[#382820]">
                    <th className="w-[14%] min-w-[120px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Acciones</th>
                    <th className="w-[10%] min-w-[90px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Ubicacion</th>
                    <th className="w-[24%] min-w-[180px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">
                      Area privativa / fraccion
                    </th>
                    <th className="w-[16%] min-w-[130px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Jerarquia</th>
                    <th className="w-[16%] min-w-[130px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Estatus de dominio</th>
                    <th className="w-[10%] min-w-[90px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">M2 actualizado</th>
                    <th className="w-[10%] min-w-[120px] border-b border-[#c3ad94] bg-[#d8c6af] px-3 py-3">Actualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.rows.length === 0 ? (
                    <tr>
                      <td colSpan={compactTableColumnCount} className="px-6 py-10 text-center text-sm text-[#6f5c4f]">
                        No hay resultados con los filtros actuales.
                      </td>
                    </tr>
                  ) : null}

                  {vm.rows.map((row) => (
                    <tr key={row.id} className="odd:bg-[#f9f4ec] even:bg-[#f5ede3]">
                      <td className="border-b border-[#ddcebc] bg-inherit px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {(legacyActionsByPrivateAreaId[row.id] ?? []).map((action) =>
                            renderLegacyAction(action),
                          )}
                        </div>
                      </td>
                      <td className="border-b border-[#ddcebc] bg-inherit px-3 py-3 text-sm font-medium text-[#3a2d24]">
                        {row.zone}
                      </td>
                      <td className="border-b border-[#ddcebc] bg-inherit px-3 py-3">
                        <p className="truncate text-sm font-semibold text-[#2f221b]">{row.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-full border border-[#c8b39d] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6d4b36]">
                            {row.code}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                              row.statusTone === "active"
                                ? "bg-[#d4eed8] text-[#255e32]"
                                : "bg-[#f1d6d6] text-[#7a2d2d]"
                            }`}
                          >
                            {row.statusLabel}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">
                        <p className="font-semibold">{row.hierarchyLabel}</p>
                        <p className="text-xs text-[#6d5b4d]">Padre: {row.parentName}</p>
                      </td>
                      <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.businessStatusLabel}</td>
                      <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#382d25]">{row.m2Updated}</td>
                      <td className="border-b border-[#ddcebc] px-3 py-3 text-sm text-[#4a3b31]">{row.updatedAtLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[#745846]">
              Pagina {vm.pagination.page} de {vm.pagination.totalPages} · {vm.pagination.totalRows} registros
            </p>

            <div className="flex items-center gap-2">
              <Link
                href={buildHref(Math.max(1, vm.pagination.page - 1))}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                  vm.pagination.hasPrev
                    ? "border-[#8b6045]/45 bg-white text-[#5f3f2b] hover:bg-[#f5ece2]"
                    : "pointer-events-none border-[#d7c9ba] bg-[#f7f1ea] text-[#ad9785]"
                }`}
              >
                Anterior
              </Link>
              <Link
                href={buildHref(Math.min(vm.pagination.totalPages, vm.pagination.page + 1))}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                  vm.pagination.hasNext
                    ? "border-[#8b6045]/45 bg-white text-[#5f3f2b] hover:bg-[#f5ece2]"
                    : "pointer-events-none border-[#d7c9ba] bg-[#f7f1ea] text-[#ad9785]"
                }`}
              >
                Siguiente
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
