"use client";

/**
 * Mis saldos: cuánto se debe (vencido, por vencer, a favor) y en qué unidad. La lista mezcla
 * propiedades y comercios ordenados por lo vencido; cada fila abre su estado de cuenta. Por
 * defecto muestra solo las unidades con adeudo, que es lo que el condómino viene a buscar.
 */
import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { ChevronRight, CircleCheck, Search } from "lucide-react";
import { msPath } from "@/components/minisitio/paths";
import { inputClass } from "@/components/minisitio/ui/field";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { UnderlineTabs } from "@/components/minisitio/ui/tabs";
import { formatCurrency } from "../_lib/format";
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

/** Sin acentos ni mayúsculas, para buscar "Ronzino" escribiendo "ronz" o "VQ#01" escribiendo "vq01". */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, "");

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
  const consulta = normalize(useDeferredValue(busqueda)).trim();

  if (unidades.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1040px] py-12 text-center">
        <p className="text-body text-fg-2">Todavía no tienes propiedades ni comercios asignados.</p>
      </div>
    );
  }

  const conAdeudo = unidades.filter((u) => u.vencido > 0);
  const base = filtro === "adeudo" ? conAdeudo : unidades;
  const visibles = consulta ? base.filter((u) => normalize(`${u.nombre} ${u.detalle} ${TIPO[u.tipo]}`).includes(consulta)) : base;
  const mixto = resumen.propiedades.total > 0 && resumen.comercios.total > 0;

  const contexto = [
    resumen.propiedades.total > 0 && `${resumen.propiedades.total} ${resumen.propiedades.total === 1 ? "propiedad" : "propiedades"}`,
    resumen.m2 > 0 && `${numero.format(resumen.m2)} m²`,
    resumen.indiviso > 0 && `${porcentaje.format(resumen.indiviso)} % de indiviso`,
    resumen.comercios.total > 0 && `${resumen.comercios.total} ${resumen.comercios.total === 1 ? "comercio" : "comercios"}`,
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <section aria-labelledby="saldos-resumen" className="rounded-panel border border-stroke-2">
        <h2 id="saldos-resumen" className="sr-only">
          Resumen de saldos
        </h2>
        {/* En el celular lo vencido va solo y grande; las otras dos, lado a lado. */}
        <dl className="grid grid-cols-2 sm:grid-cols-3">
          <div className="col-span-2 border-b border-stroke-3 px-5 py-4 sm:col-span-1 sm:border-r sm:border-b-0">
            <dt className={`text-body font-semibold ${resumen.vencido > 0 ? "text-overdue" : "text-fg-3"}`}>Saldo vencido</dt>
            <dd className="mt-0.5 text-display font-bold text-fg tabular-nums">{formatCurrency(resumen.vencido)}</dd>
          </div>
          <div className="border-r border-stroke-3 px-5 py-4">
            <dt className="text-body font-semibold text-fg-3">Por vencer</dt>
            <dd className="mt-0.5 text-subtitle font-bold text-fg tabular-nums sm:text-display">{formatCurrency(resumen.porVencer)}</dd>
          </div>
          <div className="px-5 py-4">
            <dt className={`text-body font-semibold ${resumen.aFavor > 0 ? "text-success" : "text-fg-3"}`}>A favor</dt>
            <dd className="mt-0.5 text-subtitle font-bold text-fg tabular-nums sm:text-display">{formatCurrency(resumen.aFavor)}</dd>
          </div>
        </dl>
        <p className="flex items-center gap-2 border-t border-stroke-3 px-5 py-3 text-body text-fg-2">
          {resumen.vencido === 0 && <CircleCheck className="h-4 w-4 shrink-0 text-success" strokeWidth={2.25} aria-hidden />}
          {resumenUnidades(resumen.propiedades, resumen.comercios)}
        </p>
      </section>

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
          <label className="relative mb-2 w-full sm:mb-1.5 sm:w-64">
            <span className="sr-only">Buscar unidad</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-fg-3" aria-hidden />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar unidad"
              className={`${inputClass} h-8 pl-8`}
            />
          </label>
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
                    <th scope="col" className="sticky top-[49px] z-10 border-b border-stroke-3 bg-surface py-2 pr-3 font-semibold">
                      Unidad
                    </th>
                    {mixto && (
                      <th scope="col" className="sticky top-[49px] z-10 border-b border-stroke-3 bg-surface px-3 py-2 font-semibold">
                        Tipo
                      </th>
                    )}
                    <th scope="col" className="sticky top-[49px] z-10 border-b border-stroke-3 bg-surface px-3 py-2 text-right font-semibold">
                      Vencido
                    </th>
                    <th scope="col" className="sticky top-[49px] z-10 border-b border-stroke-3 bg-surface px-3 py-2 text-right font-semibold">
                      Por vencer
                    </th>
                    <th scope="col" className="sticky top-[49px] z-10 w-8 border-b border-stroke-3 bg-surface py-2">
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
