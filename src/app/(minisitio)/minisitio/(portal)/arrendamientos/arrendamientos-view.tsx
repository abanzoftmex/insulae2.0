"use client";

/**
 * Mis comercios: los contratos de arrendamiento del condómino con su local, superficie y saldo.
 * Resumen arriba; tabla en escritorio y lista en el celular. Misma lectura que Mis propiedades y
 * Mis saldos: lo vencido en teja, lo demás en tinta.
 */
import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import type { RentalsList } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { msPath } from "@/components/minisitio/paths";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { SearchField } from "@/components/minisitio/ui/search-field";
import { StatStrip } from "@/components/minisitio/ui/stat-strip";
import { formatCurrency, normalizeSearch } from "../_lib/format";
import { parseNum, type ArrendamientoView } from "./arrendamientos-types";

const m2 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const num = (value: unknown) => parseNum(value) || 0;

/** La superficie del local: la construida si está registrada; si no, la del terreno. */
const superficie = (a: ArrendamientoView) => num(a.m2_construccion) || num(a.superficie);
const porVencer = (a: ArrendamientoView) => num(a.saldo_pendiente_no_vencido);

const PLACEHOLDERS = new Set(["Sin barrio", "Sin uso definido"]);
const local = (a: ArrendamientoView) => [a.area_privativa, a.barrio].filter((v) => v && !PLACEHOLDERS.has(v)).join(" · ");

export function ArrendamientosView({ data }: { data: RentalsList | null }) {
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-[1040px]">
        <LoadError what="tus comercios" />
      </div>
    );
  }
  if (data.arrendamientos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1040px] py-12 text-center">
        <p className="text-body text-fg-2">No tienes comercios asignados.</p>
        <p className="mt-1 text-body text-fg-3">Si crees que es un error, escríbele a la administración desde Solicitudes.</p>
      </div>
    );
  }
  return <Comercios comercios={data.arrendamientos} />;
}

function Comercios({ comercios }: { comercios: ArrendamientoView[] }) {
  const [busqueda, setBusqueda] = useState("");
  const consulta = normalizeSearch(useDeferredValue(busqueda)).trim();

  const filtrados = useMemo(
    () =>
      consulta
        ? comercios.filter((a) =>
            normalizeSearch(
              [a.nombre_comercio, a.razon_social_comercio, a.area_privativa, a.barrio, a.uso_suelo, a.contacto_administrativo, a.contacto_contable].filter(Boolean).join(" "),
            ).includes(consulta),
          )
        : comercios,
    [comercios, consulta],
  );

  const resumen = useMemo(
    () => ({
      activos: comercios.filter((a) => a.id_cat_status_comercios === 1).length,
      superficie: comercios.reduce((sum, a) => sum + superficie(a), 0),
      vencido: comercios.reduce((sum, a) => sum + num(a.saldo_vencido), 0),
      porVencer: comercios.reduce((sum, a) => sum + porVencer(a), 0),
    }),
    [comercios],
  );

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <StatStrip
        label="Resumen de tus comercios"
        items={[
          { id: "activos", label: "Contratos activos", value: `${resumen.activos} de ${comercios.length}` },
          { id: "superficie", label: "Superficie", value: `${m2.format(resumen.superficie)} m²` },
          { id: "vencido", label: "Saldo vencido", value: formatCurrency(resumen.vencido), tone: resumen.vencido > 0 ? "overdue" : undefined },
          { id: "por-vencer", label: "Por vencer", value: formatCurrency(resumen.porVencer) },
        ]}
      />

      <section aria-labelledby="comercios-lista" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-stroke-3 pb-2">
          <h2 id="comercios-lista" className="text-body-lg font-bold text-fg">
            {filtrados.length === comercios.length
              ? `${comercios.length} ${comercios.length === 1 ? "comercio" : "comercios"}`
              : `${filtrados.length} de ${comercios.length}`}
          </h2>
          <SearchField value={busqueda} onChange={setBusqueda} label="Buscar comercio" placeholder="Buscar comercio o local" className="w-full sm:w-72" />
        </div>

        {filtrados.length === 0 ? (
          <p className="py-12 text-center text-body text-fg-2">Ningún comercio coincide con «{busqueda.trim()}».</p>
        ) : (
          <>
            <table className="w-full text-body max-md:hidden">
              <thead>
                <tr className="text-left text-caption text-fg-3">
                  <Th>Comercio</Th>
                  <Th>Local</Th>
                  <Th align="right">Superficie</Th>
                  <Th align="right">Vencido</Th>
                  <Th align="right">Por vencer</Th>
                  <Th className="w-[72px]">
                    <span className="sr-only">Acciones</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke-3">
                {filtrados.map((a) => {
                  const contacto = a.contacto_administrativo || a.contacto_contable;
                  return (
                    <tr key={a.id_arrendamientos} className="group relative hover:bg-surface-2">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={msPath(`/arrendamientos/${a.id_arrendamientos}`)}
                          className="font-semibold text-fg outline-none after:absolute after:inset-0 after:rounded-surface focus-visible:after:ring-2 focus-visible:after:ring-brand"
                        >
                          {a.nombre_comercio}
                        </Link>
                        <span className="block text-caption text-fg-3">
                          {a.id_cat_status_comercios === 1 ? contacto && `Contacto: ${contacto}` : "Contrato inactivo"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-fg-2">{local(a) || <Vacio />}</td>
                      <Td>{superficie(a) > 0 ? `${m2.format(superficie(a))} m²` : <Vacio />}</Td>
                      <Td>{num(a.saldo_vencido) > 0 ? <span className="font-semibold text-overdue">{formatCurrency(num(a.saldo_vencido))}</span> : <Vacio />}</Td>
                      <Td>{porVencer(a) > 0 ? formatCurrency(porVencer(a)) : <Vacio />}</Td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <Link
                          href={msPath(`/arrendamientos/${a.id_arrendamientos}/estado-cuenta`)}
                          title="Estado de cuenta"
                          aria-label={`Estado de cuenta de ${a.nombre_comercio}`}
                          className="relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-ctrl text-fg-3 outline-none hover:bg-surface-3 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <FileText className="h-4 w-4" aria-hidden />
                        </Link>
                        <ChevronRight className="inline h-4 w-4 text-fg-4 group-hover:text-fg-2" aria-hidden />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="divide-y divide-stroke-3 md:hidden">
              {filtrados.map((a) => (
                <li key={a.id_arrendamientos}>
                  <Link
                    href={msPath(`/arrendamientos/${a.id_arrendamientos}`)}
                    className="flex items-center gap-3 py-3 outline-none focus-visible:bg-surface-2 active:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-fg">{a.nombre_comercio}</span>
                      <span className="block truncate text-caption text-fg-3">{local(a) || (a.id_cat_status_comercios === 1 ? "" : "Contrato inactivo")}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      {num(a.saldo_vencido) > 0 ? (
                        <>
                          <span className="block font-semibold text-overdue tabular-nums">{formatCurrency(num(a.saldo_vencido))}</span>
                          <span className="block text-caption text-fg-3">vencido</span>
                        </>
                      ) : (
                        <span className="text-caption font-medium text-success">Al corriente</span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-fg-4" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function Th({ children, align = "left", className = "" }: { children?: React.ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <th
      scope="col"
      className={`sticky top-[49px] z-10 border-b border-stroke-3 bg-surface py-2 font-semibold first:pr-3 not-first:px-3 ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">{children}</td>;
}

function Vacio() {
  return <span className="text-fg-4">—</span>;
}
