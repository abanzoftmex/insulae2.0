"use client";

/**
 * Resumen financiero por tipo de cuota (ordinarias o extraordinarias): las cifras del año elegido
 * y una sola tabla con los totales de los años visibles (el elegido, resaltado) y el detalle mes
 * por mes de ese año. Antes eran hasta cinco tablas de unas 40 columnas (tres años de 13
 * columnas cada uno) con encabezados beige, y el año elegido solo cambiaba las cifras de arriba.
 * Los tres años llegan del servidor: cambiar de año o de tipo no vuelve a consultar.
 */
import { useMemo, useState } from "react";
import type { GrupoMensual, ResumenFinanciero } from "@/modules/minisitio/infrastructure/queries/financials.queries";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { StatStrip } from "@/components/minisitio/ui/stat-strip";
import { UnderlineTabs } from "@/components/minisitio/ui/tabs";
import { formatCurrency } from "../_lib/format";
import { Espacio, Fila, Seccion, TablaMensual, columnasDeMeses, type Columna } from "../_reportes/tabla-mensual";
import { YearButtons } from "../_reportes/year-buttons";

/** Datos de un ejercicio: balance ordinario y extraordinario (más la cartera, que aún llega en cero). */
export type DatosAnio = ResumenFinanciero;

type Modo = "ordinary" | "extraordinary";
interface Serie {
  total: number;
  meses: number[];
}
type PorAnio = Record<number, Serie>;
interface FilaResumen {
  nombre: string;
  porAnio: PorAnio;
}

const NUMEROS = Array.from({ length: 12 }, (_, i) => i + 1);
const vacia = (): Serie => ({ total: 0, meses: NUMEROS.map(() => 0) });
const serieDe = (g: GrupoMensual): Serie => ({ total: g.totalAnual || 0, meses: NUMEROS.map((m) => g.meses.find((x) => x.mes === m)?.total || 0) });
const sumar = (series: Serie[]): Serie =>
  series.reduce((acc, s) => ({ total: acc.total + s.total, meses: acc.meses.map((v, i) => v + s.meses[i]) }), vacia());
const restar = (a: Serie, b: Serie): Serie => ({ total: a.total - b.total, meses: a.meses.map((v, i) => v - b.meses[i]) });

/**
 * Filas por nombre a lo largo de los años visibles, para que no bailen entre ejercicios (un grupo
 * que no existe en un año vale 0). Si dos grupos se llaman igual en un año, se suman: antes el
 * segundo pisaba al primero y las filas no sumaban el total.
 */
function filasPorNombre(anios: number[], gruposDe: (anio: number) => GrupoMensual[]): FilaResumen[] {
  const filas = new Map<string, PorAnio>();
  for (const anio of anios) {
    for (const g of gruposDe(anio)) {
      const nombre = g.nombre.trim() || "Sin nombre";
      const porAnio = filas.get(nombre) ?? {};
      porAnio[anio] = sumar([porAnio[anio] ?? vacia(), serieDe(g)]);
      filas.set(nombre, porAnio);
    }
  }
  return [...filas].map(([nombre, porAnio]) => ({ nombre, porAnio }));
}

const totalesPorAnio = (anios: number[], gruposDe: (anio: number) => GrupoMensual[]): PorAnio =>
  Object.fromEntries(anios.map((anio) => [anio, sumar(gruposDe(anio).map(serieDe))]));

/** Saldo acumulado dentro del año ("Bancos y caja"): el total del año es el mismo neto. */
const acumulado = (s: Serie): Serie => {
  let suma = 0;
  return { total: s.total, meses: s.meses.map((v) => (suma += v)) };
};

export function ResumenFinancieroView({
  anios,
  anioInicial,
  datosPorAnio,
  error,
}: {
  /** Años visibles (los tres más recientes con datos), en orden. */
  anios: number[];
  anioInicial: number;
  datosPorAnio: Record<number, DatosAnio>;
  error: boolean;
}) {
  const [anio, setAnio] = useState(anioInicial);
  const [modo, setModo] = useState<Modo>("ordinary");
  const ordinario = modo === "ordinary";

  const tablas = useMemo(() => {
    const balanceDe = (a: number) => (ordinario ? datosPorAnio[a]?.balanceOrdinarias : datosPorAnio[a]?.balanceExtraordinarias);
    const cuotas = (a: number) => balanceDe(a)?.ingresosMensuales ?? [];
    const otros = (a: number) => balanceDe(a)?.otrosIngresos ?? [];
    const egresos = (a: number) => balanceDe(a)?.egresosMensuales ?? [];
    const totalCuotas = totalesPorAnio(anios, cuotas);
    const totalOtros = totalesPorAnio(anios, otros);
    const totalEgresos = totalesPorAnio(anios, egresos);
    const neto = Object.fromEntries(anios.map((a) => [a, restar(sumar([totalCuotas[a], totalOtros[a]]), totalEgresos[a])])) as PorAnio;
    return {
      cuotas: filasPorNombre(anios, cuotas),
      otros: filasPorNombre(anios, otros),
      egresos: filasPorNombre(anios, egresos),
      totalCuotas,
      totalOtros,
      totalEgresos,
      neto,
      bancos: Object.fromEntries(anios.map((a) => [a, acumulado(neto[a])])) as PorAnio,
      // Extraordinarias cobradas en todos los años visibles.
      extraordinariasAcumuladas: anios.reduce((suma, a) => suma + sumar((datosPorAnio[a]?.balanceExtraordinarias?.ingresosMensuales ?? []).map(serieDe)).total, 0),
    };
  }, [datosPorAnio, anios, ordinario]);

  if (error) return <LoadError what="el resumen financiero" />;

  const cuotasAnio = tablas.totalCuotas[anio]?.total ?? 0;
  const otrosAnio = tablas.totalOtros[anio]?.total ?? 0;
  const egresosAnio = tablas.totalEgresos[anio]?.total ?? 0;
  const balance = tablas.neto[anio]?.total ?? 0;
  // En extraordinarias la consulta aún no reparte los egresos (llegan vacíos): sin ellos, un saldo
  // engañaría. Se dice abajo dónde verlos.
  const conEgresos = tablas.egresos.length > 0;

  const valoresDe = (porAnio: PorAnio) => [...anios.map((a) => porAnio[a]?.total ?? 0), ...(porAnio[anio]?.meses ?? vacia().meses)];
  const columnas: Columna[] = [
    ...anios.map((a, i) => ({
      id: `anio-${a}`,
      titulo: String(a),
      tituloCompleto: `Total de ${a}`,
      ancho: 140,
      destacada: a === anio,
      separador: i === anios.length - 1,
    })),
    ...columnasDeMeses(anio),
  ];
  const rango = anios.length > 1 ? `Totales de ${anios[0]} a ${anios[anios.length - 1]} y` : "Detalle de";

  return (
    <div className="space-y-5">
      {/* Tipo de cuota y año; el título ya lo pone el shell. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-stroke-3">
        <UnderlineTabs
          label="Tipo de cuota"
          value={modo}
          onChange={setModo}
          layoutId="rf-modo-tab"
          options={[
            { id: "ordinary" as const, label: "Cuotas ordinarias" },
            { id: "extraordinary" as const, label: "Cuotas extraordinarias" },
          ]}
        />
        <YearButtons years={anios} value={anio} onChange={setAnio} className="mb-1.5" />
      </div>
      <p className="text-body text-fg-3">
        {rango} {anio} mes por mes · Montos en pesos
      </p>

      <StatStrip
        label={`Resumen ${anio}`}
        items={
          ordinario
            ? [
                { id: "cuotas", label: "Cuotas ordinarias", value: formatCurrency(cuotasAnio) },
                { id: "otros", label: "Otros ingresos", value: formatCurrency(otrosAnio) },
                { id: "egresos", label: "Egresos", value: formatCurrency(egresosAnio) },
                {
                  id: "balance",
                  label: "Balance",
                  value: formatCurrency(balance),
                  tone: balance < 0 ? "overdue" : balance > 0 ? "success" : undefined,
                },
              ]
            : [
                { id: "cuotas", label: `Cuotas extraordinarias ${anio}`, value: formatCurrency(cuotasAnio) },
                { id: "acumuladas", label: `Cobradas desde ${anios[0]}`, value: formatCurrency(tablas.extraordinariasAcumuladas) },
              ]
        }
        footer={
          ordinario ? (
            <>
              Ingresos del año: <span className="font-semibold text-fg tabular-nums">{formatCurrency(cuotasAnio + otrosAnio)}</span> (cuotas y otros
              ingresos).{" "}
              {balance !== 0 && (
                <>
                  Los {balance < 0 ? "egresos los superaron" : "ingresos superaron a los egresos"} por{" "}
                  <span className="font-semibold text-fg tabular-nums">{formatCurrency(Math.abs(balance))}</span>.
                </>
              )}
            </>
          ) : undefined
        }
      />

      <TablaMensual
        columnas={columnas}
        grupos={[
          { titulo: anios.length > 1 ? "Total del año" : "Total", columnas: anios.length },
          { titulo: `${anio}, mes por mes`, columnas: 12 },
        ]}
        descripcion={`Resumen financiero de cuotas ${ordinario ? "ordinarias" : "extraordinarias"}, en pesos`}
        region={`Resumen financiero por año y por mes de ${anio}`}
      >
        <tbody>
          <Seccion titulo="Ingresos por cuotas" />
          {tablas.cuotas.map((f) => (
            <Fila key={f.nombre} etiqueta={f.nombre} valores={valoresDe(f.porAnio)} />
          ))}
          <Fila estilo="total" etiqueta="Total de cuotas" valores={valoresDe(tablas.totalCuotas)} />
        </tbody>

        {tablas.otros.length > 0 && (
          <tbody>
            <Seccion titulo="Otros ingresos" />
            {tablas.otros.map((f) => (
              <Fila key={f.nombre} etiqueta={f.nombre} valores={valoresDe(f.porAnio)} />
            ))}
            <Fila estilo="total" etiqueta="Total de otros ingresos" valores={valoresDe(tablas.totalOtros)} />
          </tbody>
        )}

        {conEgresos && (
          <>
            <tbody>
              <Seccion titulo="Egresos" />
              {tablas.egresos.map((f) => (
                <Fila key={f.nombre} etiqueta={f.nombre} valores={valoresDe(f.porAnio)} />
              ))}
              <Fila estilo="total" etiqueta="Total de egresos" valores={valoresDe(tablas.totalEgresos)} />
            </tbody>
            <tbody>
              <Espacio />
              <Fila estilo="total" conSigno etiqueta="Ingresos − egresos" valores={valoresDe(tablas.neto)} />
              <Fila conSigno etiqueta="Bancos y caja (acumulado del año)" valores={valoresDe(tablas.bancos)} />
            </tbody>
          </>
        )}
      </TablaMensual>

      <p className="text-caption text-fg-3">
        {ordinario
          ? "Ingresos y egresos registrados por la administración. Un guion (—) indica un mes sin movimientos."
          : "Aquí solo se muestran los cobros de cuotas extraordinarias. Los gastos extraordinarios aparecen en el Estado de resultados, en “Gastos extraordinarios”."}
      </p>
    </div>
  );
}
