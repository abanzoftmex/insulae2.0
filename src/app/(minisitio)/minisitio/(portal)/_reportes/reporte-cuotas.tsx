"use client";

/**
 * Reporte de cuotas por área, ordinarias o extraordinarias (solo propietarios). Una fila por área
 * con su cuota mensual vigente, lo vencido, lo pendiente y lo que se cargó cada mes del año
 * elegido. En las áreas con comercio, cada celda trae una segunda línea con la parte del comercio
 * (C). Paginado en el servidor; la página siguiente llega con la tabla atenuada.
 *
 * Antes eran dos pantallas casi iguales con tarjetas con íconos, una leyenda de cinco píldoras,
 * encabezados en MAYÚSCULAS, 36 columnas de meses (tres años), un tríptico por año que repetía la
 * misma cuota (anual = mensual × 12) junto a un "saldo del año" que siempre llegaba en cero,
 * "Pago anticipado" también en cero, y colores de mora calculados con la fecha del último cargo
 * (no indicaban mora).
 */
import { useRef, useState, useTransition } from "react";
import type { FeesReport, FeesReportArea, FeesReportType } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { fieldBaseClass } from "@/components/minisitio/ui/field";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { Paginator } from "@/components/minisitio/ui/paginator";
import { toast } from "@/stores/minisitio-toast.store";
import { getFeesReportAction } from "../../_actions/reports";
import { CELDA, FilaLibre, Importe, TablaMensual, claseDeColumna, columnasDeMeses, useColumnas, type Columna, type Estilo } from "./tabla-mensual";
import { YearButtons } from "./year-buttons";

/** Parte del propietario (p) y del comercio (c). */
interface PC {
  p: number;
  c: number;
}

const POR_PAGINA = [10, 30, 50];
const CERO: PC = { p: 0, c: 0 };
const numero = new Intl.NumberFormat("es-MX");
const sumar = (a: PC, b: PC): PC => ({ p: a.p + b.p, c: a.c + b.c });
const porGrupo = (lista: { propietario: number; comercio: number }[] | undefined): PC =>
  (lista ?? []).reduce((t, x) => sumar(t, { p: x.propietario || 0, c: x.comercio || 0 }), CERO);

/** Cuota, vencido, pendiente y los 12 meses del año, en el orden de las columnas. */
function valoresDe(area: FeesReportArea, anio: number): PC[] {
  const cargos = area[`pagosMensuales${anio}`] ?? [];
  const meses = Array.from({ length: 12 }, (_, i) =>
    cargos.reduce((t, g) => sumar(t, { p: g.mesesPropietario?.[i] || 0, c: g.mesesComercio?.[i] || 0 }), CERO),
  );
  return [porGrupo(area.cuotasPorGrupo), porGrupo(area.carteraVencidaPorGrupo), porGrupo(area.saldosPorGrupo), ...meses];
}

/**
 * Fila de montos dobles. La línea del comercio sale en toda la fila (para que se alinee) solo si
 * el área tiene comercio y algún importe suyo: en extraordinarias casi nunca lo hay.
 */
function FilaPC({ etiqueta, valores, conComercio, estilo = "normal" }: { etiqueta: React.ReactNode; valores: PC[]; conComercio: boolean; estilo?: Estilo }) {
  const columnas = useColumnas();
  const peso = estilo === "total" ? "font-bold" : "font-normal";
  const lineaComercio = conComercio && valores.some((v) => Math.abs(v.c) >= 0.005);
  return (
    <FilaLibre etiqueta={etiqueta} estilo={estilo}>
      {columnas.map((columna: Columna, i) => {
        const v = valores[i] ?? CERO;
        const enMora = (n: number) => columna.alerta && n >= 0.005;
        return (
          <td key={columna.id} className={`${CELDA} ${claseDeColumna(columna)} ${peso} ${enMora(v.p) ? "text-overdue" : i < 3 ? "text-fg" : "text-fg-2"}`}>
            <span className="block">
              <Importe valor={v.p} />
            </span>
            {lineaComercio && (
              <span className={`block text-caption ${enMora(v.c) ? "text-overdue" : "text-fg-3"}`}>
                <abbr title="Comercio" className="no-underline">
                  C
                </abbr>{" "}
                <Importe valor={v.c} />
              </span>
            )}
          </td>
        );
      })}
    </FilaLibre>
  );
}

export function ReporteCuotas({
  tipo,
  inicial,
  limiteInicial,
  anioEnCurso,
}: {
  tipo: FeesReportType;
  inicial: FeesReport | null;
  limiteInicial: number;
  anioEnCurso: number;
}) {
  const [datos, setDatos] = useState(inicial);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(limiteInicial);
  const [anioElegido, setAnioElegido] = useState<number | null>(null);
  const [pendiente, startTransition] = useTransition();
  const tablaRef = useRef<HTMLDivElement>(null);

  if (!datos) return <LoadError what="el reporte de cuotas" />;

  const anios = datos.anios.length ? datos.anios : [anioEnCurso];
  const anio = anioElegido && anios.includes(anioElegido) ? anioElegido : anios.includes(anioEnCurso) ? anioEnCurso : anios[anios.length - 1];
  const totalPaginas = Math.max(1, Math.ceil(datos.total / limite));

  const cargar = (nuevaPagina: number, nuevoLimite: number) => {
    tablaRef.current?.scrollIntoView({ block: "start" });
    startTransition(async () => {
      try {
        const resultado = await getFeesReportAction({ tipo, page: nuevaPagina, limit: nuevoLimite });
        startTransition(() => {
          setDatos(resultado);
          setPagina(nuevaPagina);
          setLimite(nuevoLimite);
        });
      } catch (error) {
        console.error("[minisitio] reporte de cuotas:", error);
        toast("No se pudo cargar esa página. Inténtalo otra vez.", "error");
      }
    });
  };

  const filas = datos.apoles.map((area) => ({ area, valores: valoresDe(area, anio) }));
  const paginaConComercio = datos.apoles.some((a) => a.tieneArrendamiento);
  const totales = filas.reduce<PC[]>((acc, f) => acc.map((t, i) => sumar(t, f.valores[i])), Array.from({ length: 15 }, () => CERO));
  const columnas: Columna[] = [
    { id: "cuota", titulo: "Cuota mensual", tituloCompleto: "Cuota mensual vigente", ancho: 140 },
    { id: "vencido", titulo: "Vencido", ancho: 140, alerta: true },
    { id: "pendiente", titulo: "Pendiente", tituloCompleto: "Pendiente de pago", ancho: 140, separador: true },
    ...columnasDeMeses(anio),
  ];

  return (
    <div className="space-y-4">
      <div ref={tablaRef} className="flex scroll-mt-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-stroke-3 pb-3 lg:scroll-mt-14">
        <p className="text-body text-fg-3">
          {numero.format(datos.total)} áreas · Cuotas {tipo === "ordinaria" ? "ordinarias" : "extraordinarias"} · Montos en pesos
        </p>
        <div className="flex items-center gap-3">
          <label htmlFor={`rc-${tipo}-limite`} className="sr-only">
            Áreas por página
          </label>
          <select
            id={`rc-${tipo}-limite`}
            value={limite}
            onChange={(e) => cargar(1, Number(e.target.value))}
            disabled={pendiente}
            className={`${fieldBaseClass} h-8 pr-8`}
          >
            {POR_PAGINA.map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>
          <YearButtons years={anios} value={anio} onChange={setAnioElegido} />
        </div>
      </div>

      <TablaMensual
        etiqueta="Área"
        columnas={columnas}
        grupos={[
          { titulo: "Cuenta", columnas: 3 },
          { titulo: `Cargos de ${anio}`, columnas: 12 },
        ]}
        descripcion={`Cuotas ${tipo === "ordinaria" ? "ordinarias" : "extraordinarias"} por área, página ${pagina} de ${totalPaginas}`}
        region="Cuotas por área y por mes"
        pendiente={pendiente}
      >
        <tbody>
          {filas.map(({ area, valores }) => {
            const detalle = [area.id_cat_status !== 1 && area.status?.nombre, area.tieneArrendamiento && "Con comercio"].filter(Boolean).join(" · ");
            return (
              <FilaPC
                key={area.id}
                etiqueta={
                  <>
                    <span className="block">{area.nombre}</span>
                    {detalle && <span className="block text-caption text-fg-3">{detalle}</span>}
                  </>
                }
                valores={valores}
                conComercio={area.tieneArrendamiento}
              />
            );
          })}
          <FilaPC estilo="total" etiqueta="Total de esta página" valores={totales} conComercio={paginaConComercio} />
        </tbody>
      </TablaMensual>

      <Paginator page={pagina} totalPages={totalPaginas} totalRows={datos.total} onPageChange={(p) => cargar(p, limite)} isPending={pendiente} rowsLabel="áreas" />

      <p className="text-caption text-fg-3">
        Pendiente: lo que falta pagar de estas cuotas; vencido: la parte cuyo plazo ya pasó. Los meses muestran lo que se cargó en cada uno. En las
        áreas con comercio, la segunda línea (C) es la parte del comercio. Un guion (—) indica que no hay importe.
      </p>
    </div>
  );
}
