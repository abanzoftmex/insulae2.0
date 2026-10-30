"use client";

/**
 * Mis saldos: cuánto se debe (vencido, por vencer, a favor) y en qué unidad. La lista mezcla
 * propiedades y comercios ordenados por lo vencido; cada fila abre su estado de cuenta. Por
 * defecto muestra solo las unidades con adeudo, que es lo que el condómino viene a buscar.
 */
import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { ChevronRight, CircleCheck } from "lucide-react";
import { msPath } from "@/components/minisitio/paths";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { SearchField } from "@/components/minisitio/ui/search-field";
import { StatStrip } from "@/components/minisitio/ui/stat-strip";
import { UnderlineTabs } from "@/components/minisitio/ui/tabs";
import { formatCurrency, normalizeSearch } from "../_lib/format";
import { resumenUnidades, type ConteoUnidades } from "../_lib/saldos";

export interface UnidadSaldo {
  id: string;
  tipo: "propiedad" | "comercio";
  nombre: string;
  /** Barrio, uso o local: lo que ayuda a reconocerla ("" si no hay). */
  detalle: string;
  vencido: number;
  porVencer: number;
  aFavor: number;
  /** Estado de cuenta (sin /minisitio). */
  href: string;
}

interface Resumen {
  vencido: number;
  porVencer: number;
  aFavor: number;
  propiedades: ConteoUnidades;
  comercios: ConteoUnidades;
  m2: number;
  indiviso: number;
}

type Filtro = "adeudo" | "todas";

const TIPO = { propiedad: "Propiedad", comercio: "Comercio" } as const;


const numero = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const porcentaje = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export function SaldosView({ data }: { data: { resumen: Resumen; unidades: UnidadSaldo[] } | null }) {
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-[1040px]">
        <LoadError what="tus saldos" />
      </div>
    );
  }
  return <Saldos resumen={data.resumen} unidades={data.unidades} />;
}

function Saldos({ resumen, unidades }: { resumen: Resumen; unidades: UnidadSaldo[] }) {
  const [filtro, setFiltro] = useState<Filtro>(resumen.vencido > 0 ? "adeudo" : "todas");
  const [busqueda, setBusqueda] = useState("");
  const consulta = normalizeSearch(useDeferredValue(busqueda)).trim();

  if (unidades.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1040px] py-12 text-center">
        <p className="text-body text-fg-2">Todavía no tienes propiedades ni comercios asignados.</p>
      </div>
    );
  }

  const conAdeudo = unidades.filter((u) => u.vencido > 0);
  const base = filtro === "adeudo" ? conAdeudo : unidades;
  const visibles = consulta ? base.filter((u) => normalizeSearch(`${u.nombre} ${u.detalle} ${TIPO[u.tipo]}`).includes(consulta)) : base;
  const mixto = resumen.propiedades.total > 0 && resumen.comercios.total > 0;

  const contexto = [
    resumen.propiedades.total > 0 && `${resumen.propiedades.total} ${resumen.propiedades.total === 1 ? "propiedad" : "propiedades"}`,
    resumen.m2 > 0 && `${numero.format(resumen.m2)} m²`,
    resumen.indiviso > 0 && `${porcentaje.format(resumen.indiviso)} % de indiviso`,
    resumen.comercios.total > 0 && `${resumen.comercios.total} ${resumen.comercios.total === 1 ? "comercio" : "comercios"}`,
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <StatStrip
        label="Resumen de saldos"
        items={[
          { id: "vencido", label: "Saldo vencido", value: formatCurrency(resumen.vencido), tone: resumen.vencido > 0 ? "overdue" : undefined },
          { id: "por-vencer", label: "Por vencer", value: formatCurrency(resumen.porVencer) },
          { id: "a-favor", label: "A favor", value: formatCurrency(resumen.aFavor), tone: resumen.aFavor > 0 ? "success" : undefined },
        ]}
        footer={
          <p className="flex items-center gap-2">
            {resumen.vencido === 0 && <CircleCheck className="h-4 w-4 shrink-0 text-success" strokeWidth={2.25} aria-hidden />}
            {resumenUnidades(resumen.propiedades, resumen.comercios)}
          </p>
        }
      />

      <section aria-labelledby="saldos-unidades" className="mt-8">
        <h2 id="saldos-unidades" className="text-body-lg font-bold text-fg">
          Por unidad
        </h2>
        {contexto.length > 0 && <p className="text-caption text-fg-3">{contexto.join(" · ")}</p>}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-stroke-3">
          <UnderlineTabs
            label="Mostrar unidades"
            value={filtro}
            onChange={setFiltro}
            layoutId="saldos-tab"
            options={[
              { id: "adeudo", label: "Con saldo vencido", count: conAdeudo.length },
              { id: "todas", label: "Todas", count: unidades.length },
            ]}
          />
          <SearchField value={busqueda} onChange={setBusqueda} label="Buscar unidad" className="mb-2 w-full sm:mb-1.5 sm:w-64" />
        </div>

        <div role="tabpanel" aria-label={filtro === "adeudo" ? "Unidades con saldo vencido" : "Todas las unidades"}>
          {visibles.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-12 text-body text-fg-2">
              {consulta ? (
                `Ninguna unidad coincide con «${busqueda.trim()}».`
              ) : (
                <>
                  <CircleCheck className="h-4 w-4 text-success" strokeWidth={2.25} aria-hidden />
                  Ninguna unidad tiene saldo vencido.
                </>
              )}
            </p>
          ) : (
            <>
              {/* Escritorio: tabla con encabezado fijo bajo el de la vista. */}
              <table className="w-full text-body max-sm:hidden">
                <thead>
                  <tr className="text-left text-caption text-fg-3">
                    <th scope="col" className="sticky top-[52px] z-10 lg:top-[49px] border-b border-stroke-3 bg-surface py-2 pr-3 font-semibold">
                      Unidad
                    </th>
                    {mixto && (
                      <th scope="col" className="sticky top-[52px] z-10 lg:top-[49px] border-b border-stroke-3 bg-surface px-3 py-2 font-semibold">
                        Tipo
                      </th>
                    )}
                    <th scope="col" className="sticky top-[52px] z-10 lg:top-[49px] border-b border-stroke-3 bg-surface px-3 py-2 text-right font-semibold">
                      Vencido
                    </th>
                    <th scope="col" className="sticky top-[52px] z-10 lg:top-[49px] border-b border-stroke-3 bg-surface px-3 py-2 text-right font-semibold">
                      Por vencer
                    </th>
                    <th scope="col" className="sticky top-[52px] z-10 lg:top-[49px] w-8 border-b border-stroke-3 bg-surface py-2">
                      <span className="sr-only">Estado de cuenta</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke-3">
                  {visibles.map((u) => (
                    <tr key={`${u.tipo}-${u.id}`} className="group relative hover:bg-surface-2">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={msPath(u.href)}
                          className="font-semibold text-fg outline-none after:absolute after:inset-0 after:rounded-surface focus-visible:after:ring-2 focus-visible:after:ring-brand"
                        >
                          {u.nombre}
                          <span className="sr-only">, ver estado de cuenta</span>
                        </Link>
                        {u.detalle && <span className="block text-caption text-fg-3">{u.detalle}</span>}
                      </td>
                      {mixto && <td className="px-3 py-2.5 text-fg-2">{TIPO[u.tipo]}</td>}
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <Monto value={u.vencido} vencido />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <Monto value={u.porVencer} />
                      </td>
                      <td className="py-2.5 text-right">
                        <ChevronRight className="inline h-4 w-4 text-fg-4 group-hover:text-fg-2" aria-hidden />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Celular: una fila por unidad con lo vencido a la derecha. */}
              <ul className="divide-y divide-stroke-3 sm:hidden">
                {visibles.map((u) => (
                  <li key={`${u.tipo}-${u.id}`}>
                    <Link href={msPath(u.href)} className="flex items-center gap-3 py-3 outline-none focus-visible:bg-surface-2 active:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-fg">{u.nombre}</span>
                        <span className="block truncate text-caption text-fg-3">{[mixto && TIPO[u.tipo], u.detalle].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        {u.vencido > 0 ? (
                          <>
                            <span className="block font-semibold text-overdue tabular-nums">{formatCurrency(u.vencido)}</span>
                            <span className="block text-caption text-fg-3">vencido</span>
                          </>
                        ) : u.porVencer > 0 ? (
                          <>
                            <span className="block font-semibold text-fg tabular-nums">{formatCurrency(u.porVencer)}</span>
                            <span className="block text-caption text-fg-3">por vencer</span>
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
        </div>
      </section>
    </div>
  );
}

function Monto({ value, vencido = false }: { value: number; vencido?: boolean }) {
  if (value <= 0) return <span className="text-fg-4">—</span>;
  return <span className={vencido ? "font-semibold text-overdue" : "text-fg"}>{formatCurrency(value)}</span>;
}
