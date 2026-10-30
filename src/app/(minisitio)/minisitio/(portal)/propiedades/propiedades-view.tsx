"use client";

/**
 * Mis propiedades: las áreas privativas del condómino en el orden del condominio (fusiones → AP →
 * sus FAP, ver propiedades-organizer), con superficie, indiviso y saldo. Resumen arriba; tabla con
 * totales en escritorio y lista en el celular. El PDF sale de lo que se ve (respeta la búsqueda).
 */
import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileDown, FileText, Info } from "lucide-react";
import type { PropertiesList } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import type { ProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioSession } from "@/components/minisitio/session-provider";
import { buttonClass } from "@/components/minisitio/ui/button";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { SearchField } from "@/components/minisitio/ui/search-field";
import { StatStrip } from "@/components/minisitio/ui/stat-strip";
import { toast } from "@/stores/minisitio-toast.store";
import { formatCurrency, normalizeSearch } from "../_lib/format";
import { generatePropertiesReportPdf } from "./propiedades-report-pdf";
import { organizarPropiedadesHierarquicamente, tieneReferencia } from "./propiedades-organizer";
import { parseNum, type PropiedadView } from "./propiedades-format";

/** El total del proyecto que usaba el minisitio cuando no se podía leer. */
const TOTAL_M2_PROYECTO_POR_DEFECTO = 157850.23;

const m2 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const num = (value: unknown) => parseNum(value) || 0;
const porVencer = (p: PropiedadView) => Math.max(0, num(p.saldo_pendiente) - num(p.saldo_vencido));

/** En las FAP la superficie que cuenta viene en m² de construcción. */
const superficie = (p: PropiedadView) => (tieneReferencia(p.id_areas_privativas_padre) ? num(p.m2_construccion) || num(p.m2_totales) : num(p.m2_totales));

const PLACEHOLDERS = new Set(["Sin barrio", "Sin uso definido"]);
const detalle = (p: PropiedadView) => [p.zona, p.uso_suelo].filter((v) => v && !PLACEHOLDERS.has(v)).join(" · ");

export function PropiedadesView({ data, proyecto }: { data: PropertiesList | null; proyecto: ProjectInfo | null }) {
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-[1040px]">
        <LoadError what="tus propiedades" />
      </div>
    );
  }
  if (data.propiedades.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1040px] py-12 text-center">
        <p className="text-body text-fg-2">No tienes propiedades asignadas.</p>
        <p className="mt-1 text-body text-fg-3">Si crees que es un error, escríbele a la administración desde Solicitudes.</p>
      </div>
    );
  }
  return <Propiedades propiedades={data.propiedades} proyecto={proyecto} />;
}

function Propiedades({ propiedades, proyecto }: { propiedades: PropiedadView[]; proyecto: ProjectInfo | null }) {
  const { user } = useMinisitioSession();
  const [busqueda, setBusqueda] = useState("");
  const [verIndiviso, setVerIndiviso] = useState(false);
  const [generando, setGenerando] = useState(false);
  const consulta = normalizeSearch(useDeferredValue(busqueda)).trim();
  const totalM2Proyecto = proyecto?.totalM2 || TOTAL_M2_PROYECTO_POR_DEFECTO;

  const filtradas = useMemo(
    () => (consulta ? propiedades.filter((p) => normalizeSearch(`${p.nombre} ${p.iniciales} ${p.zona} ${p.uso_suelo}`).includes(consulta)) : propiedades),
    [propiedades, consulta],
  );
  const filas = useMemo(() => organizarPropiedadesHierarquicamente(filtradas), [filtradas]);
  // Una FAP cuelga de su AP solo si esa AP está en la lista (puede no ser del condómino).
  const enLista = useMemo(() => new Set(filtradas.map((p) => p.id_areas_privativas)), [filtradas]);
  const anidada = (p: (typeof filas)[number]) => p.tipo === "hijo" && p.id_areas_privativas_padre != null && enLista.has(p.id_areas_privativas_padre);

  const totales = useMemo(
    () =>
      filtradas.reduce(
        (acc, p) => ({
          superficie: acc.superficie + num(p.m2_totales),
          construccion: acc.construccion + num(p.m2_construccion),
          indiviso: acc.indiviso + num(p.indiviso),
          vencido: acc.vencido + num(p.saldo_vencido),
          porVencer: acc.porVencer + porVencer(p),
        }),
        { superficie: 0, construccion: 0, indiviso: 0, vencido: 0, porVencer: 0 },
      ),
    [filtradas],
  );

  // El resumen es de todas las propiedades, no de la búsqueda.
  const resumen = useMemo(
    () => ({
      superficie: propiedades.reduce((sum, p) => sum + superficie(p), 0),
      indiviso: propiedades.reduce((sum, p) => sum + num(p.indiviso) + num(p.indiviso_fap_condominio), 0),
      vencido: propiedades.reduce((sum, p) => sum + num(p.saldo_vencido), 0),
      porVencer: propiedades.reduce((sum, p) => sum + porVencer(p), 0),
    }),
    [propiedades],
  );

  const descargar = async () => {
    if (filtradas.length === 0) return;
    setGenerando(true);
    try {
      await generatePropertiesReportPdf({ propiedades: filtradas, proyecto, user });
    } catch (error) {
      console.error("[minisitio] reporte de propiedades:", error);
      toast("No se pudo generar el PDF. Inténtalo otra vez.", "error");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <StatStrip
        label="Resumen de tus propiedades"
        items={[
          { id: "superficie", label: "Superficie", value: `${m2.format(resumen.superficie)} m²` },
          {
            id: "indiviso",
            label: "Indiviso",
            value: `${pct.format(resumen.indiviso)} %`,
            addon: (
              <button
                type="button"
                onClick={() => setVerIndiviso((v) => !v)}
                aria-expanded={verIndiviso}
                aria-controls="indiviso-ayuda"
                aria-label="Qué es el indiviso"
                className="-my-0.5 inline-flex h-5 w-5 items-center justify-center rounded-ctrl text-fg-3 outline-none hover:bg-surface-3 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Info className="h-4 w-4" aria-hidden />
              </button>
            ),
          },
          { id: "vencido", label: "Saldo vencido", value: formatCurrency(resumen.vencido), tone: resumen.vencido > 0 ? "overdue" : undefined },
          { id: "por-vencer", label: "Por vencer", value: formatCurrency(resumen.porVencer) },
        ]}
        footer={
          verIndiviso ? (
            <p id="indiviso-ayuda">
              El indiviso es tu parte del condominio. Si no está registrado, se calcula con la superficie: m² de la propiedad ÷{" "}
              {m2.format(totalM2Proyecto)} m² del proyecto × 100.
            </p>
          ) : undefined
        }
      />

      <section aria-labelledby="propiedades-lista" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-stroke-3 pb-2">
          <h2 id="propiedades-lista" className="text-body-lg font-bold text-fg">
            {filtradas.length === propiedades.length
              ? `${propiedades.length} ${propiedades.length === 1 ? "propiedad" : "propiedades"}`
              : `${filtradas.length} de ${propiedades.length}`}
          </h2>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <SearchField value={busqueda} onChange={setBusqueda} label="Buscar propiedad" placeholder="Buscar propiedad" className="min-w-0 flex-1 sm:w-72" />
            <button
              type="button"
              onClick={descargar}
              disabled={generando || filtradas.length === 0}
              title="Descarga en PDF las propiedades de la lista"
              className={buttonClass("outline", "sm")}
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden />
              {generando ? "Generando…" : "PDF"}
              <span className="sr-only"> de las propiedades de la lista</span>
            </button>
          </div>
        </div>

        {filtradas.length === 0 ? (
          <p className="py-12 text-center text-body text-fg-2">Ninguna propiedad coincide con «{busqueda.trim()}».</p>
        ) : (
          <>
            <table className="w-full text-body max-md:hidden">
              <thead>
                <tr className="text-left text-caption text-fg-3">
                  <Th>Propiedad</Th>
                  <Th align="right">Superficie</Th>
                  <Th align="right">Construcción</Th>
                  <Th align="right">Indiviso</Th>
                  <Th align="right">Vencido</Th>
                  <Th align="right">Por vencer</Th>
                  <Th className="w-[72px]">
                    <span className="sr-only">Acciones</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke-3">
                {filas.map((p) => {
                  const fap = p.tipo === "hijo";
                  const dentro = anidada(p);
                  return (
                    <tr key={`${p.id_areas_privativas}-${p.tipo}`} className="group relative hover:bg-surface-2">
                      <td className={`py-2.5 pr-3 ${dentro ? "pl-6" : ""}`}>
                        {/* Las FAP cuelgan de su AP con una guía, como las respuestas de un hilo. */}
                        {dentro && <span aria-hidden className="absolute top-0 bottom-0 left-2 border-l border-stroke-2" />}
                        <span className="mr-1.5 text-caption font-semibold text-fg-3">{fap ? "FAP" : "AP"}</span>
                        <Link
                          href={msPath(`/propiedades/${p.id_areas_privativas}`)}
                          className="font-semibold text-fg outline-none after:absolute after:inset-0 after:rounded-surface focus-visible:after:ring-2 focus-visible:after:ring-brand"
                        >
                          {p.nombre}
                        </Link>
                        {detalle(p) && (
                          <span className="block max-w-[340px] truncate text-caption text-fg-3" title={detalle(p)}>
                            {detalle(p)}
                          </span>
                        )}
                      </td>
                      <Td>{num(p.m2_totales) > 0 ? `${m2.format(num(p.m2_totales))} m²` : <Vacio />}</Td>
                      <Td>{num(p.m2_construccion) > 0 ? `${m2.format(num(p.m2_construccion))} m²` : <Vacio />}</Td>
                      <Td>{num(p.indiviso) > 0 ? `${pct.format(num(p.indiviso))} %` : <Vacio />}</Td>
                      <Td>{num(p.saldo_vencido) > 0 ? <span className="font-semibold text-overdue">{formatCurrency(num(p.saldo_vencido))}</span> : <Vacio />}</Td>
                      <Td>{porVencer(p) > 0 ? formatCurrency(porVencer(p)) : <Vacio />}</Td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <Link
                          href={msPath(`/propiedades/${p.id_areas_privativas}/estado-cuenta`)}
                          title="Estado de cuenta"
                          aria-label={`Estado de cuenta de ${p.nombre}`}
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
              <tfoot>
                <tr className="border-t border-stroke-2 font-semibold text-fg">
                  <td className="py-3 pr-3">Total</td>
                  <Td>{m2.format(totales.superficie)} m²</Td>
                  <Td>{m2.format(totales.construccion)} m²</Td>
                  <Td>{pct.format(totales.indiviso)} %</Td>
                  <Td>
                    <span className={totales.vencido > 0 ? "text-overdue" : ""}>{formatCurrency(totales.vencido)}</span>
                  </Td>
                  <Td>{formatCurrency(totales.porVencer)}</Td>
                  <td />
                </tr>
              </tfoot>
            </table>

            <ul className="divide-y divide-stroke-3 md:hidden">
              {filas.map((p) => {
                const fap = p.tipo === "hijo";
                return (
                  <li key={`${p.id_areas_privativas}-${p.tipo}`}>
                    <Link
                      href={msPath(`/propiedades/${p.id_areas_privativas}`)}
                      className={`flex items-center gap-3 py-3 outline-none focus-visible:bg-surface-2 active:bg-surface-2 ${anidada(p) ? "pl-4" : ""}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-fg">
                          <span className="mr-1.5 text-caption text-fg-3">{fap ? "FAP" : "AP"}</span>
                          {p.nombre}
                        </span>
                        <span className="block truncate text-caption text-fg-3">
                          {[num(p.m2_totales) > 0 && `${m2.format(num(p.m2_totales))} m²`, detalle(p)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {num(p.saldo_vencido) > 0 ? (
                          <>
                            <span className="block font-semibold text-overdue tabular-nums">{formatCurrency(num(p.saldo_vencido))}</span>
                            <span className="block text-caption text-fg-3">vencido</span>
                          </>
                        ) : (
                          <span className="text-caption font-medium text-success">Al corriente</span>
                        )}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-fg-4" aria-hidden />
                    </Link>
                  </li>
                );
              })}
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
