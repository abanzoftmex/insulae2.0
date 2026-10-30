"use client";

/**
 * Estado de resultados del condominio: ingresos, egresos y balance de un año, mes por mes, en una
 * sola tabla para que los meses queden alineados (antes eran tres tablas de anchos distintos,
 * tarjetas con sombra y bandas de color). Cada grupo de egreso se abre en sus conceptos
 * presupuestales, de mayor a menor gasto: antes el chevrón abría siempre una lista vacía y "Ver
 * conceptos", un modal sin datos. El año vive en la URL (?anio=): al cambiarlo, el servidor vuelve
 * a pintar la pantalla y mientras tanto la tabla anterior queda atenuada.
 */
import { Fragment, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { EgresosGrupos, Ingresos, getEstadoResultadoTotales } from "@/modules/minisitio/infrastructure/queries/financials.queries";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { StatStrip } from "@/components/minisitio/ui/stat-strip";
import { formatCurrency } from "../_lib/format";
import { Espacio, Fila, FilaAccion, Seccion, Subseccion, TablaMensual, columnasDeMeses, type Columna } from "../_reportes/tabla-mensual";
import { YearButtons } from "../_reportes/year-buttons";

/** Carga del servidor: cada sección falla por separado; sin totales no hay pantalla. */
export interface EstadoResultadoData {
  totales: Awaited<ReturnType<typeof getEstadoResultadoTotales>>;
  ingresos: Ingresos | null;
  egresos: EgresosGrupos | null;
}

type Meses = Record<number, number>;

const NUMEROS = Array.from({ length: 12 }, (_, i) => i + 1);
/** Conceptos visibles al abrir un grupo; el resto, con "Ver los N restantes". */
const PRIMEROS = 10;

const sumar = (a: Meses, b: Meses, signo = 1): Meses => Object.fromEntries(NUMEROS.map((m) => [m, (a[m] || 0) + signo * (b[m] || 0)]));
/** Total del año y los 12 meses, en el orden de las columnas. */
const valores = (total: number, meses: Meses) => [total, ...NUMEROS.map((m) => meses[m] || 0)];

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
  const columnas: Columna[] = [{ id: "total", titulo: `Total ${anio}`, ancho: 140, separador: true }, ...columnasDeMeses(anio)];

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
        <TablaMensual columnas={columnas} descripcion={`Estado de resultados ${anio}, en pesos`} region={`Ingresos y egresos de ${anio}, mes por mes`} pendiente={pendiente}>
          {ingresos && ingresosPorMes && (
            <tbody>
              <Seccion titulo="Ingresos" />
              {ingresos.principales.map((i) => (
                <Fila key={i.id} etiqueta={i.nombre} valores={valores(i.totalAnual, i.meses)} />
              ))}
              {ingresos.otros.length > 0 && (
                <>
                  <Fila estilo="subtotal" etiqueta="Subtotal de ingresos principales" valores={valores(ingresos.totalPrincipalesAnual, ingresos.totalesPrincipalesPorMes)} />
                  <Subseccion titulo="Otros ingresos" />
                  {ingresos.otros.map((i) => (
                    <Fila key={i.id} etiqueta={i.nombre} valores={valores(i.totalAnual, i.meses)} />
                  ))}
                  <Fila estilo="subtotal" etiqueta="Subtotal de otros ingresos" valores={valores(ingresos.totalOtrosAnual, ingresos.totalesOtrosPorMes)} />
                </>
              )}
              <Fila estilo="total" etiqueta="Total de ingresos" valores={valores(ingresos.totalAnual, ingresosPorMes)} />
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
                      className="-mx-1 flex w-full items-center gap-2 rounded-ctrl px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
                    <Fila estilo="grupo" etiqueta={etiqueta} valores={valores(grupo.totalAnual, grupo.meses)} />
                    {visibles.map((o) => (
                      <Fila key={o.id} estilo="detalle" etiqueta={o.nombre} valores={valores(o.totalAnual, o.meses)} />
                    ))}
                    {abierto && cuantos > PRIMEROS && (
                      <FilaAccion>
                        <button type="button" onClick={() => alternar(setCompletos, grupo.id)} className={buttonClass("ghost", "sm")}>
                          {completo ? `Ver solo los ${PRIMEROS} principales` : `Ver los ${cuantos - PRIMEROS} conceptos restantes`}
                        </button>
                      </FilaAccion>
                    )}
                  </Fragment>
                );
              })}
              <Fila estilo="total" etiqueta="Total de egresos" valores={valores(egresos.totalAnual, egresos.totalesPorMes)} />
            </tbody>
          )}

          {ingresosPorMes && egresos && (
            <tbody>
              <Espacio />
              <Fila estilo="total" conSigno etiqueta="Balance (ingresos − egresos)" valores={valores(balance, sumar(ingresosPorMes, egresos.totalesPorMes, -1))} />
            </tbody>
          )}
        </TablaMensual>
      )}

      <p className="text-caption text-fg-3">
        Ingresos y egresos registrados por la administración en {anio}. Un guion (—) indica un mes sin movimientos; los conceptos de cada grupo
        van de mayor a menor gasto.
      </p>
    </div>
  );
}
