import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { getDirectoryUseCase } from "@/modules/directory";
import { toDirectoryVM } from "@/modules/directory/presentation/directory.vm";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-directory-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-directory-body",
});

export const metadata: Metadata = {
  title: "Directorio | Insulae 2.0",
  description: "Directorio operativo de personas, roles y asignaciones del condominio.",
};

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;
type PaginationToken = number | "ellipsis";

type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function pickParam(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
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

export default async function DirectorioPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const query = pickParam(params.q).trim();
  const page = parsePositiveInteger(pickParam(params.page), 1);
  const pageSize = 100;
  const directory = await getDirectoryUseCase.execute({ query, page, pageSize });
  const vm = directory ? toDirectoryVM(directory) : null;

  const buildHref = (nextPage: number): string => {
    const search = new URLSearchParams();
    if (query) {
      search.set("q", query);
    }

    search.set("page", String(nextPage));
    return `/directorio?${search.toString()}`;
  };

  const buildEditHref = (reference: string): string => {
    const search = new URLSearchParams();
    if (query) {
      search.set("q", query);
    }
    search.set("page", String(vm?.pagination.page ?? page));
    return `/directorio/formulario/${encodeURIComponent(reference)}?${search.toString()}`;
  };

  return (
    <main
      className={`${cormorant.variable} ${manrope.variable} relative isolate min-h-screen bg-[#f3eadc] px-5 pb-16 pt-8 text-[#231912] sm:px-8 lg:px-12`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[#b36f46]/18 blur-3xl" />
        <div className="absolute right-[-8rem] top-[10rem] h-[20rem] w-[20rem] rounded-full bg-[#5c7a56]/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.45),transparent_40%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="rounded-[2rem] border border-[#bfa283]/40 bg-[#fff7ea]/80 p-6 shadow-[0_15px_50px_rgba(64,37,19,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-[#8f593b]/30 bg-[#8f593b]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6e3e26]">
              Modulo Directorio
            </span>
            <Link
              href="/condominio"
              className="rounded-full border border-[#1f1a17]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f1a17] transition hover:border-[#1f1a17] hover:bg-[#1f1a17] hover:text-[#fffaf1]"
            >
              Ir a Condominio
            </Link>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <h1 className="font-[var(--font-directory-display)] text-4xl leading-none text-[#2e221c] sm:text-5xl">
                Directorio
              </h1>
              <p className="max-w-2xl font-[var(--font-directory-body)] text-sm leading-relaxed text-[#5d4f46] sm:text-base">
                Vista independiente del directorio del condominio con datos actuales de base de datos:
                personas activas, roles y datos de contacto.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d0b094] bg-[#2e221c] p-5 text-[#f5e8d7]">
              <p className="font-[var(--font-directory-body)] text-xs uppercase tracking-[0.2em] text-[#e7c8a7]">
                Resumen
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#e2c2a4]/35 bg-[#3c2b23] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#e7c8a7]">Personas</p>
                  <p className="mt-1 font-[var(--font-directory-display)] text-3xl leading-none">
                    {vm?.totalUsers ?? "0"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e2c2a4]/35 bg-[#3c2b23] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#e7c8a7]">Asignaciones</p>
                  <p className="mt-1 font-[var(--font-directory-display)] text-3xl leading-none">
                    {vm?.totalAssignments ?? "0"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {vm ? (
          <section className="rounded-3xl border border-[#bfa283]/45 bg-[#fff9f0]/88 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
            <form method="get" className="grid gap-3 border-b border-[#d2b9a2] pb-4 md:grid-cols-[1fr_auto]">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f583f]">
                Buscar en directorio
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Nombre, correo, telefono, rol o APoL"
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

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#d2b9a2] pb-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7e5741]">
                Pagina {vm.pagination.page} de {vm.pagination.totalPages} · {vm.pagination.totalRows} registros
              </p>

              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {vm.pagination.hasPrev ? (
                  <Link
                    href={buildHref(vm.pagination.page - 1)}
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

                {buildPaginationTokens(vm.pagination.page, vm.pagination.totalPages).map((token, index) => {
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

                  if (token === vm.pagination.page) {
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
                      href={buildHref(token)}
                      className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#d8c5b1] bg-[#f5efe6] px-2 text-sm font-semibold text-[#3e332a] transition hover:border-[#bea182] hover:bg-[#ecdfcf]"
                      aria-label={`Ir a la pagina ${token}`}
                    >
                      {token}
                    </Link>
                  );
                })}

                {vm.pagination.hasNext ? (
                  <Link
                    href={buildHref(vm.pagination.page + 1)}
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
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[1180px] w-full table-fixed border-separate border-spacing-0 text-sm">
                <colgroup>
                  <col className="w-[170px]" />
                  <col className="w-[270px]" />
                  <col className="w-[170px]" />
                  <col className="w-[150px]" />
                  <col className="w-[230px]" />
                  <col className="w-[120px]" />
                  <col className="w-[170px]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#7a553f]">
                    <th className="border-b border-[#d7c7b5] bg-[#f8ecde] px-3 py-2">Comercios</th>
                    <th className="border-b border-[#d7c7b5] bg-[#f8ecde] px-3 py-2">Nombre / Razon social</th>
                    <th className="border-b border-[#d7c7b5] px-3 py-2">Rol</th>
                    <th className="border-b border-[#d7c7b5] px-3 py-2">Telefono</th>
                    <th className="border-b border-[#d7c7b5] px-3 py-2">Correo electronico</th>
                    <th className="border-b border-[#d7c7b5] px-3 py-2">Requiere factura</th>
                    <th className="border-b border-[#d7c7b5] px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.people.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-[#6a594c]">
                        No hay resultados para la busqueda actual.
                      </td>
                    </tr>
                  ) : (
                    vm.people.map((person) => (
                      <tr key={person.id} className="odd:bg-[#f9f4ec] even:bg-[#f5ede3]">
                        <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                          <p className="text-[12px] text-[#3a2b22]">{person.commerceLabel}</p>
                        </td>
                        <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                          <p className="text-sm font-semibold text-[#2f221a]">{person.legalNameLabel}</p>
                        </td>
                        <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                          <p className="text-[12px] text-[#3a2b22]">{person.primaryRoleLabel}</p>
                        </td>
                        <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                          <p className="text-[12px] text-[#544438]">{person.phone}</p>
                        </td>
                        <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                          <p className="text-[12px] text-[#544438]">{person.email}</p>
                        </td>
                        <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                          <p className="text-[12px] text-[#3a2b22]">{person.requiresInvoiceLabel}</p>
                        </td>
                        <td className="border-b border-[#e0d2c2] px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            <Link
                              href={buildEditHref(person.reference)}
                              className="inline-flex rounded-lg border border-[#9a6b4a] bg-[#fff3e5] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6e3f26] transition hover:bg-[#f6e1c9]"
                            >
                              Editar
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-[#c8ad95] bg-[#fff8ef] p-6 text-center">
            <h2 className="font-[var(--font-directory-display)] text-3xl text-[#2f221a]">
              Sin condominio activo
            </h2>
            <p className="mt-2 font-[var(--font-directory-body)] text-sm text-[#68584c]">
              No se encontro un condominio activo para desplegar el directorio.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
