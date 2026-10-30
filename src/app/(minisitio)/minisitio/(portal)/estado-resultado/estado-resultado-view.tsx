"use client";

/**
 * Estado de resultados del condominio: ingresos, egresos y balance de un año, mes por mes, en una
 * sola tabla para que los meses queden alineados (antes eran tres tablas de anchos distintos,
 * tarjetas con sombra y bandas de color). Cada grupo de egreso se abre en sus conceptos
 * presupuestales, de mayor a menor gasto: antes el chevrón abría siempre una lista vacía y "Ver
 * conceptos", un modal sin datos. El año vive en la URL (?anio=): al cambiarlo, el servidor vuelve
 * a pintar la pantalla y mientras tanto la tabla anterior queda atenuada.
 */
import { Fragment, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { EgresosGrupos, Ingresos, getEstadoResultadoTotales } from "@/modules/minisitio/infrastructure/queries/financials.queries";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { StatStrip } from "@/components/minisitio/ui/stat-strip";
import { formatCurrency } from "../_lib/format";
import { YearButtons } from "../_reportes/year-buttons";

/** Carga del servidor: cada sección falla por separado; sin totales no hay pantalla. */
export interface EstadoResultadoData {
  totales: Awaited<ReturnType<typeof getEstadoResultadoTotales>>;
  ingresos: Ingresos | null;
  egresos: EgresosGrupos | null;
}

type Meses = Record<number, number>;
type Estilo = "normal" | "grupo" | "detalle" | "subtotal" | "total";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const NUMEROS = MESES.map((_, i) => i + 1);
/** Conceptos visibles al abrir un grupo; el resto, con "Ver los N restantes". */
const PRIMEROS = 10;

const sumar = (a: Meses, b: Meses, signo = 1): Meses => Object.fromEntries(NUMEROS.map((m) => [m, (a[m] || 0) + signo * (b[m] || 0)]));

/** Peso y color de cada tipo de fila; el balance cambia el color a "vencido" cuando es negativo. */
const ESTILOS: Record<Estilo, { fila: string; etiqueta: string; total: [string, string]; mes: [string, string] }> = {
  normal: {
    fila: "group hover:bg-surface-2",
    etiqueta: "bg-surface px-4 font-normal text-fg group-hover:bg-surface-2",
    total: ["font-semibold", "text-fg"],
    mes: ["font-normal", "text-fg-2"],
  },
  grupo: {
    fila: "group hover:bg-surface-2",
    etiqueta: "bg-surface px-4 font-semibold text-fg group-hover:bg-surface-2",
    total: ["font-semibold", "text-fg"],
    mes: ["font-semibold", "text-fg"],
  },
  detalle: {
    fila: "group animate-fade-in hover:bg-surface-2",
    etiqueta: "bg-surface pr-4 pl-10 font-normal text-fg-2 group-hover:bg-surface-2",
    total: ["font-normal", "text-fg-2"],
    mes: ["font-normal", "text-fg-3"],
  },
  subtotal: {
    fila: "bg-surface-2",
    etiqueta: "bg-surface-2 px-4 font-semibold text-fg",
    total: ["font-semibold", "text-fg"],
    mes: ["font-semibold", "text-fg-2"],
  },
  total: {
    fila: "bg-surface-2",
    etiqueta: "bg-surface-2 px-4 font-bold text-fg",
    total: ["font-bold", "text-fg"],
    mes: ["font-bold", "text-fg"],
  },
};

/** Mismo ancho de columnas en el encabezado a la vista y en el cuerpo (tabla de ancho fijo). */
const TABLA = "w-[calc(var(--er-etiqueta)_+_1580px)] min-w-full table-fixed border-separate border-spacing-0 text-body";
const CELDA = "h-10 border-b border-stroke-3 px-3 text-right whitespace-nowrap tabular-nums";
/** Primera columna: fija al desplazar a lo ancho, con sombra cuando quedan columnas ocultas a la izquierda. */
const FIJA = "sticky left-0 z-10 group-data-[desplazado]/tabla:shadow-[6px_0_8px_-6px_rgb(0_0_0/0.14)]";
/** Etiqueta de una fila; el padding horizontal lo pone cada estilo. */
const ETIQUETA = `${FIJA} border-r border-b border-stroke-3 py-2 text-left`;

function Columnas() {
  return (
    <colgroup>
      <col className="w-(--er-etiqueta)" />
      <col className="w-[140px]" />
      {NUMEROS.map((m) => (
        <col key={m} className="w-[120px]" />
      ))}
    </colgroup>
  );
}

function Monto({ valor, className }: { valor: number; className: string }) {
  return (
    <td className={`${CELDA} ${className}`}>
      {valor === 0 ? (
        <>
          <span aria-hidden className="font-normal text-fg-4">
            —
          </span>
          <span className="sr-only">Sin movimientos</span>
        </>
      ) : (
        formatCurrency(valor)
      )}
    </td>
  );
}

function Fila({
  etiqueta,
  total,
  meses,
  estilo = "normal",
  conSigno = false,
}: {
  etiqueta: React.ReactNode;
  total: number;
  meses: Meses;
  estilo?: Estilo;
  /** Negativos en el color de "vencido" (el balance). */
  conSigno?: boolean;
}) {
  const e = ESTILOS[estilo];
  const clase = ([peso, color]: [string, string], valor: number) => `${peso} ${conSigno && valor < 0 ? "text-overdue" : color}`;
  return (
    <tr className={e.fila}>
      <th scope="row" className={`${ETIQUETA} ${e.etiqueta}`}>
        {etiqueta}
      </th>
      <Monto valor={total} className={`border-r border-stroke-3 ${clase(e.total, total)}`} />
      {NUMEROS.map((m) => (
        <Monto key={m} valor={meses[m] || 0} className={clase(e.mes, meses[m] || 0)} />
      ))}
    </tr>
  );
}

function Seccion({ titulo }: { titulo: string }) {
  return (
    <tr>
      <th scope="rowgroup" className={`${FIJA} border-b border-stroke-2 bg-surface px-4 pt-6 pb-2 text-left text-body-lg font-bold text-fg`}>
        {titulo}
      </th>
      <td colSpan={13} className="border-b border-stroke-2" />
    </tr>
  );
}

/** Subtítulo dentro de una sección (p. ej. "Otros ingresos", que repite nombres de las cuotas). */
function Subseccion({ titulo }: { titulo: string }) {
  return (
    <tr>
      <th scope="row" className={`${FIJA} border-b border-stroke-3 bg-surface px-4 pt-4 pb-1.5 text-left text-body font-semibold text-fg-2`}>
        {titulo}
      </th>
      <td colSpan={13} className="border-b border-stroke-3" />
    </tr>
  );
}

export function EstadoResultadoView({
  data,
  anio,
  anios,
  anioEnCurso,
}: {
  data: (EstadoResultadoData & { ingresosError: boolean; egresosError: boolean }) | null;
  anio: number;
  /** Años para elegir (con movimientos y los que ofrecía el minisitio). */
  anios: number[];
  anioEnCurso: number;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [anioVisible, setAnioVisible] = useOptimistic(anio);
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(() => new Set());
  const [completos, setCompletos] = useState<ReadonlySet<string>>(() => new Set());
  const marcoRef = useRef<HTMLDivElement>(null);
  const cabeceraRef = useRef<HTMLDivElement>(null);
  const cuerpoRef = useRef<HTMLDivElement>(null);

  // El encabezado a la vista sigue al cuerpo a lo ancho, y la primera columna lleva sombra en
  // cuanto hay columnas ocultas a la izquierda (sin estado: no se vuelve a pintar al desplazar).
  const sincronizar = (e: React.UIEvent<HTMLDivElement>) => {
    const x = e.currentTarget.scrollLeft;
    if (cabeceraRef.current) cabeceraRef.current.scrollLeft = x;
    marcoRef.current?.toggleAttribute("data-desplazado", x > 0);
  };

  const cambiarAnio = (nuevo: number) =>
    startTransition(() => {
      setAnioVisible(nuevo);
      router.push(msPath(`/estado-resultado?anio=${nuevo}`), { scroll: false });
    });
  const alternar = (setter: typeof setAbiertos, id: string) =>
    setter((previo) => {
      const siguiente = new Set(previo);
      if (!siguiente.delete(id)) siguiente.add(id);
      return siguiente;
    });

  const periodo = anio === anioEnCurso ? `Del 1 de enero de ${anio} a hoy` : `Del 1 de enero al 31 de diciembre de ${anio}`;
  const encabezado = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-stroke-3 pb-3">
      <p className="text-body text-fg-3">{periodo} · Montos en pesos</p>
      <YearButtons years={anios} value={anioVisible} onChange={cambiarAnio} />
    </div>
  );

  if (!data) {
    return (
      <div className="space-y-5">
        {encabezado}
        <LoadError what="el estado de resultados" />
      </div>
    );
  }

  const { totales, ingresos, egresos } = data;
  const balance = totales.balance;
  const ingresosPorMes = ingresos ? sumar(ingresos.totalesPrincipalesPorMes, ingresos.totalesOtrosPorMes) : null;

  return (
    <div className="space-y-5">
      {encabezado}

      <StatStrip
        label={`Resultado ${anio}`}
        items={[
          { id: "ingresos", label: "Ingresos", value: formatCurrency(totales.totalIngresos) },
          { id: "egresos", label: "Egresos", value: formatCurrency(totales.totalEgresos) },
          {
            id: "balance",
            label: "Balance",
            value: formatCurrency(balance),
            tone: balance < 0 ? "overdue" : balance > 0 ? "success" : undefined,
          },
        ]}
        footer={
          balance === 0 ? (
            "Los ingresos y los egresos del año quedaron iguales."
          ) : (
            <>
              Los {balance < 0 ? "egresos superaron a los ingresos" : "ingresos superaron a los egresos"} por{" "}
              <span className="font-semibold text-fg tabular-nums">{formatCurrency(Math.abs(balance))}</span>.
            </>
          )
        }
      />

      {data.ingresosError && <LoadError what="el detalle de los ingresos" />}
      {data.egresosError && <LoadError what="el detalle de los egresos" />}

      {(ingresos || egresos) && (
        <div
          ref={marcoRef}
          className={`group/tabla rounded-panel border border-stroke-2 transition-opacity duration-160 ease-slack [--er-etiqueta:180px] sm:[--er-etiqueta:300px] ${pendiente ? "opacity-60" : ""}`}
        >
          {/* Encabezado a la vista: se queda bajo la barra al desplazar la página (un solo scroll, el
              de la página) y sigue el scroll horizontal del cuerpo. La tabla trae el suyo para
              lectores de pantalla. */}
          <div
            ref={cabeceraRef}
            aria-hidden
            onWheel={(e) => {
              if (e.deltaX && cuerpoRef.current) cuerpoRef.current.scrollLeft += e.deltaX;
            }}
            className="sticky top-[52px] z-[15] overflow-hidden rounded-t-panel bg-surface lg:top-[49px]"
          >
            <table className={TABLA}>
              <Columnas />
              <tbody>
                <tr>
                  <th className={`${FIJA} h-10 border-r border-b border-stroke-2 bg-surface px-4 text-left text-caption font-semibold text-fg-3`}>Concepto</th>
                  <th className="h-10 border-r border-b border-stroke-2 px-3 text-right text-caption font-semibold text-fg-3">Total {anio}</th>
                  {MESES.map((mes) => (
                    <th key={mes} className="h-10 border-b border-stroke-2 px-3 text-right text-caption font-semibold text-fg-3 capitalize">
                      {mes.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div
            ref={cuerpoRef}
            role="region"
            aria-label={`Ingresos y egresos de ${anio}, mes por mes`}
            aria-busy={pendiente}
            tabIndex={0}
            onScroll={sincronizar}
            className="overflow-x-auto rounded-b-panel outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <table className={TABLA}>
              <caption className="sr-only">Estado de resultados {anio}, en pesos. Un guion indica un mes sin movimientos.</caption>
              <Columnas />
              <thead>
                <tr className="[&>th]:h-0 [&>th]:border-0 [&>th]:p-0 [&>th]:text-[0px] [&>th]:leading-[0]">
                  <th scope="col">Concepto</th>
                  <th scope="col">Total {anio}</th>
                  {MESES.map((mes) => (
                    <th key={mes} scope="col">
                      {mes}
                    </th>
                  ))}
                </tr>
              </thead>

              {ingresos && ingresosPorMes && (
                <tbody>
                  <Seccion titulo="Ingresos" />
                  {ingresos.principales.map((i) => (
                    <Fila key={i.id} etiqueta={i.nombre} total={i.totalAnual} meses={i.meses} />
                  ))}
                  {ingresos.otros.length > 0 && (
                    <>
                      <Fila estilo="subtotal" etiqueta="Subtotal de ingresos principales" total={ingresos.totalPrincipalesAnual} meses={ingresos.totalesPrincipalesPorMes} />
                      <Subseccion titulo="Otros ingresos" />
                      {ingresos.otros.map((i) => (
                        <Fila key={i.id} etiqueta={i.nombre} total={i.totalAnual} meses={i.meses} />
                      ))}
                      <Fila estilo="subtotal" etiqueta="Subtotal de otros ingresos" total={ingresos.totalOtrosAnual} meses={ingresos.totalesOtrosPorMes} />
                    </>
                  )}
                  <Fila estilo="total" etiqueta="Total de ingresos" total={ingresos.totalAnual} meses={ingresosPorMes} />
                </tbody>
              )}

              {egresos && (
                <tbody>
                  <Seccion titulo="Egresos" />
                  {egresos.grupos.map((grupo) => {
                    const abierto = abiertos.has(grupo.id);
                    const completo = completos.has(grupo.id);
                    const cuantos = grupo.opciones.length;
                    const visibles = abierto ? (completo ? grupo.opciones : grupo.opciones.slice(0, PRIMEROS)) : [];
                    const etiqueta =
                      cuantos === 0 ? (
                        grupo.nombre
                      ) : (
                        <button
                          type="button"
                          onClick={() => alternar(setAbiertos, grupo.id)}
                          aria-expanded={abierto}
                          className="-mx-1 flex w-full items-center gap-1.5 rounded-ctrl px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <ChevronRight aria-hidden className={`h-4 w-4 shrink-0 text-fg-3 transition-transform duration-160 ease-slack ${abierto ? "rotate-90" : ""}`} />
                          <span className="min-w-0">
                            <span className="block">{grupo.nombre}</span>
                            <span className="block text-caption font-normal text-fg-3">
                              {[grupo.detalle, `${cuantos} ${cuantos === 1 ? "concepto" : "conceptos"}`].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </button>
                      );
                    return (
                      <Fragment key={grupo.id}>
                        <Fila estilo="grupo" etiqueta={etiqueta} total={grupo.totalAnual} meses={grupo.meses} />
                        {visibles.map((o) => (
                          <Fila key={o.id} estilo="detalle" etiqueta={o.nombre} total={o.totalAnual} meses={o.meses} />
                        ))}
                        {abierto && cuantos > PRIMEROS && (
                          <tr className="animate-fade-in">
                            <th scope="row" className={`${ETIQUETA} bg-surface pr-4 pl-8 font-normal`}>
                              <button type="button" onClick={() => alternar(setCompletos, grupo.id)} className={buttonClass("ghost", "sm")}>
                                {completo ? `Ver solo los ${PRIMEROS} principales` : `Ver los ${cuantos - PRIMEROS} conceptos restantes`}
                              </button>
                            </th>
                            <td colSpan={13} className="border-b border-stroke-3" />
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  <Fila estilo="total" etiqueta="Total de egresos" total={egresos.totalAnual} meses={egresos.totalesPorMes} />
                </tbody>
              )}

              {ingresosPorMes && egresos && (
                <tbody>
                  <tr aria-hidden>
                    <td colSpan={14} className="h-4 border-b border-stroke-2" />
                  </tr>
                  <Fila estilo="total" conSigno etiqueta="Balance (ingresos − egresos)" total={balance} meses={sumar(ingresosPorMes, egresos.totalesPorMes, -1)} />
                </tbody>
              )}
            </table>
          </div>
        </div>
      )}

      <p className="text-caption text-fg-3">
        Ingresos y egresos registrados por la administración en {anio}. Un guion (—) indica un mes sin movimientos; los conceptos de cada grupo
        van de mayor a menor gasto.
      </p>
    </div>
  );
}
