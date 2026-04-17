import type { Metadata } from "next";
import Link from "next/link";
import { Lora, Nunito_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { getPrivateAreaListingUseCase } from "@/modules/private-areas";
import {
  type PrivateAreaRowVM,
  toPrivateAreaListingVM,
} from "@/modules/private-areas/presentation/private-area-listing.vm";

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
  title: "Listado Seguridad APoLes | Insulae 2.0",
  description:
    "Listado de seguridad de AP/FAP con barrio, dominio pleno y arrendatario, migrado desde legado.",
};

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

type PaginationToken = number | "ellipsis";

function pickParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
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

function resolveDomainContacts(row: PrivateAreaRowVM) {
  if (row.domainFull.length > 0) {
    return row.domainFull;
  }

  if (row.domainCurrent.length > 0) {
    return row.domainCurrent;
  }

  return row.ownerLegal;
}

function resolveTenantContacts(row: PrivateAreaRowVM) {
  if (row.tenantUsers.length > 0) {
    return row.tenantUsers;
  }

  if (row.rentalOperationalContacts.length > 0) {
    return row.rentalOperationalContacts;
  }

  return row.rentalAdministrativeContacts;
}

function renderContacts(
  contacts: Array<{ name: string; email: string | null; phone: string | null }>,
  emptyLabel = "-",
): ReactNode {
  if (contacts.length === 0) {
    return <span className="text-[#8a7869]">{emptyLabel}</span>;
  }

  return (
    <div className="space-y-2">
      {contacts.map((contact, index) => (
        <article
          key={`${contact.name}-${contact.email ?? ""}-${contact.phone ?? ""}-${index}`}
          className="rounded-xl border border-[#dccdbd] bg-[#fffdf9] px-2 py-1.5"
        >
          <p className="break-words text-sm font-semibold text-[#2f241d]">{contact.name}</p>
          <p className="break-all text-[11px] text-[#69584c]">correo: {contact.email ?? "sin correo"}</p>
          <p className="break-words text-[11px] text-[#69584c]">telefono: {contact.phone ?? "sin telefono"}</p>
        </article>
      ))}
    </div>
  );
}

function normalizeAreaLabel(row: PrivateAreaRowVM): string {
  if (row.hierarchyLabel === "Hijo") {
    return row.name;
  }

  return `AP: ${row.name.replace(/^FAP:\s*/i, "")}`;
}

function buildPaginationTokens(currentPage: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 1) {
    return [1];
  }

  const pages = new Set<number>([1, totalPages]);

  for (let index = currentPage - 2; index <= currentPage + 2; index += 1) {
    if (index >= 1 && index <= totalPages) {
      pages.add(index);
    }
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const tokens: PaginationToken[] = [];

  let previousPage: number | null = null;
  for (const page of sortedPages) {
    if (previousPage !== null) {
      const gap = page - previousPage;
      if (gap === 2) {
        tokens.push(previousPage + 1);
      } else if (gap > 2) {
        tokens.push("ellipsis");
      }
    }

    tokens.push(page);
    previousPage = page;
  }

  return tokens;
}

function renderPaginationBar(input: {
  currentPage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  buildHref: (nextPage: number) => string;
}): ReactNode {
  const tokens = buildPaginationTokens(input.currentPage, input.totalPages);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {input.hasPrev ? (
        <Link
          href={input.buildHref(input.currentPage - 1)}
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#d8c5b1] bg-[#f5efe6] px-2 text-sm font-semibold text-[#4a3a2f] transition hover:border-[#bea182] hover:bg-[#ecdfcf]"
          aria-label="Pagina anterior"
        >
          &lt;
        </Link>
      ) : (
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#e3d5c8] bg-[#f5efe6] px-2 text-sm font-semibold text-[#b8a492]">
          &lt;
        </span>
      )}

      {tokens.map((token, index) => {
        if (token === "ellipsis") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold text-[#786658]"
            >
              ...
            </span>
          );
        }

        const isCurrent = token === input.currentPage;

        if (isCurrent) {
          return (
            <span
              key={`page-${token}`}
              aria-current="page"
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#b89145] bg-[#c89d3a] px-2 text-sm font-bold text-[#fff8ea]"
            >
              {token}
            </span>
          );
        }

        return (
          <Link
            key={`page-${token}`}
            href={input.buildHref(token)}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#d8c5b1] bg-[#f5efe6] px-2 text-sm font-semibold text-[#3e332a] transition hover:border-[#bea182] hover:bg-[#ecdfcf]"
            aria-label={`Ir a la pagina ${token}`}
          >
            {token}
          </Link>
        );
      })}

      {input.hasNext ? (
        <Link
          href={input.buildHref(input.currentPage + 1)}
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#d8c5b1] bg-[#f5efe6] px-2 text-sm font-semibold text-[#4a3a2f] transition hover:border-[#bea182] hover:bg-[#ecdfcf]"
          aria-label="Pagina siguiente"
        >
          &gt;
        </Link>
      ) : (
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#e3d5c8] bg-[#f5efe6] px-2 text-sm font-semibold text-[#b8a492]">
          &gt;
        </span>
      )}
    </div>
  );
}

export default async function ListadoSeguridadPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const query = pickParam(params.palabra) ?? pickParam(params.q) ?? "";
  const page = parsePositiveInteger(pickParam(params.page), 1);
  const pageSize = 20;

  const listing = await getPrivateAreaListingUseCase.execute({
    query,
    status: "ALL",
    page,
    pageSize,
    paginateByTopLevel: true,
  });

  if (!listing) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-6 py-20">
        <div className="rounded-3xl border border-[#cdb39a]/50 bg-[#fff8ef] p-8 text-center shadow-[0_16px_34px_rgba(43,28,20,0.12)]">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Listado seguridad</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2d2018]">Sin datos disponibles</h1>
          <p className="mt-3 text-sm text-[#604f42]">
            No se encontro un condominio activo para construir la vista.
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

  const vm = toPrivateAreaListingVM(listing);

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();

    if (query.trim()) {
      search.set("palabra", query.trim());
    }

    search.set("page", String(nextPage));
    return `/listado-seguridad?${search.toString()}`;
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
        {/* VISUAL: Este bloque es seguro para ajustes de color, tipografia y sombras sin tocar datos. */}
        <header className="rounded-[2rem] border border-[#bfaa93]/45 bg-[#fff7eb]/88 p-6 shadow-[0_18px_45px_rgba(43,27,17,0.12)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-[#7b4f38]/35 bg-[#7b4f38]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#73452e]">
              Seguridad
            </span>
            <Link
              href="/areas-privativas"
              className="rounded-full border border-[#2b211d]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b211d] transition hover:border-[#2b211d] hover:bg-[#2b211d] hover:text-[#fff7ec]"
            >
              Volver a Areas Privativas
            </Link>
          </div>

          <h1 className="mt-4 font-[var(--font-private-display)] text-4xl leading-none text-[#2c2019] sm:text-5xl">
            Listado APoLes Seguridad
          </h1>
          <p className="mt-3 max-w-4xl font-[var(--font-private-body)] text-sm leading-relaxed text-[#5a4b40] sm:text-base">
            Pantalla migrada de legacy para consulta operativa de Barrio, AP/FAP, Dominio pleno y Arrendatario.
          </p>
        </header>

        {/* VISUAL: Puedes ajustar paddings/bordes de este formulario para mejoras UX, sin cambiar nombres de input. */}
        <section className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/88 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <form method="get" className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f583f]">
              Buscador
              <input
                type="text"
                name="palabra"
                defaultValue={query}
                placeholder="Nombre o iniciales"
                className="rounded-xl border border-[#cfb8a1] bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#2d241f]"
              />
            </label>

            <button
              type="submit"
              className="h-fit self-end rounded-xl border border-[#7f4e34] bg-[#7f4e34] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#fff7ec] transition hover:brightness-110"
            >
              Buscar
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfb8a2]/70 pb-3">
            <h2 className="font-[var(--font-private-display)] text-2xl leading-none text-[#2b1f18] sm:text-3xl">
              Listado de APoLes
            </h2>
            <p className="text-xs uppercase tracking-[0.14em] text-[#7e5741]">
              Pagina {vm.pagination.page} de {vm.pagination.totalPages} · {vm.pagination.totalRows} registros
            </p>
          </div>

          <div className="mt-4 border-b border-[#d8c7b5] pb-4">
            {renderPaginationBar({
              currentPage: vm.pagination.page,
              totalPages: vm.pagination.totalPages,
              hasPrev: vm.pagination.hasPrev,
              hasNext: vm.pagination.hasNext,
              buildHref,
            })}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1180px] w-full table-fixed border-separate border-spacing-0 text-sm">
              <colgroup>
                <col className="w-[180px]" />
                <col className="w-[340px]" />
                <col className="w-[330px]" />
                <col className="w-[330px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#7a553f]">
                  <th className="border-b border-[#d7c7b5] bg-[#f8ecde] px-3 py-2">
                    Barrio
                  </th>
                  <th className="border-b border-[#d7c7b5] bg-[#f8ecde] px-3 py-2">
                    Area privativa / Fraccion
                  </th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Dominio pleno</th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Arrendatario</th>
                </tr>
              </thead>
              <tbody>
                {vm.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-[#6a594c]">
                      No hay AP/FAP para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  vm.rows.map((row) => (
                    // VISUAL: aqui puedes cambiar el zebra de filas (odd/even) sin alterar reglas de negocio.
                    <tr key={row.id} className="odd:bg-[#f9f4ec] even:bg-[#f5ede3]">
                      <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                        <p className="text-sm text-[#2d241f]">
                          Barrio: <strong>{row.zone}</strong>
                        </p>
                      </td>

                      <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                        <p className="text-sm font-semibold text-[#2f221a]">{normalizeAreaLabel(row)}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#715342]">
                          Tipo: {row.hierarchyLabel}
                        </p>
                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                              row.statusTone === "active"
                                ? "border-[#6e8f53] bg-[#edf6e4] text-[#43632a]"
                                : "border-[#ab7f7f] bg-[#f8ebeb] text-[#8a3f3f]"
                            }`}
                          >
                            {row.businessStatusLabel}
                          </span>
                        </div>
                      </td>

                      <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                        {renderContacts(resolveDomainContacts(row))}
                      </td>

                      <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                        {renderContacts(resolveTenantContacts(row))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-t border-[#d8c7b5] pt-4">
            {renderPaginationBar({
              currentPage: vm.pagination.page,
              totalPages: vm.pagination.totalPages,
              hasPrev: vm.pagination.hasPrev,
              hasNext: vm.pagination.hasNext,
              buildHref,
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
