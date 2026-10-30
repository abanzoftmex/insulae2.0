"use client";

/**
 * Tabla de montos por mes de los reportes (Estado de resultados, Resumen financiero), con un solo
 * scroll: el de la página. El encabezado a la vista es una copia que se queda bajo la barra (52 px
 * en el celular, 49 en escritorio) y sigue el scroll horizontal del cuerpo; la tabla trae su
 * propio <thead> aplanado para lectores de pantalla. Las dos tablas usan el mismo <colgroup> con
 * `table-fixed`, así que sus columnas coinciden. La primera columna queda fija y lleva sombra en
 * cuanto hay columnas ocultas a la izquierda. Un mes sin movimientos se marca con "—".
 *
 * Si una columna está destacada (el año elegido) y queda fuera de la vista, por ejemplo en el
 * celular, la tabla se desplaza sola hasta ella: al instante al cargar, suave al cambiar de año.
 *
 * Las filas (`Fila`, `Seccion`, `Subseccion`, `FilaAccion`) van dentro de <tbody> y leen las
 * columnas del contexto.
 */
import { createContext, use, useEffect, useRef } from "react";
import { formatCurrency } from "../_lib/format";

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export interface Columna {
  id: string;
  /** Lo que se ve en el encabezado ("Ene", "2025"). */
  titulo: string;
  /** Para lectores de pantalla y el tooltip ("enero de 2025"); si falta, `titulo`. */
  tituloCompleto?: string;
  /** Ancho en px. */
  ancho: number;
  /** Línea a la derecha: separa los totales de los meses. */
  separador?: boolean;
  /** Fondo crema: la columna del año elegido. */
  destacada?: boolean;
}

/** Encabezado que agrupa columnas consecutivas ("Total del año", "2025, mes por mes"). */
export interface GrupoColumnas {
  titulo: string;
  columnas: number;
}

/** Columnas de los 12 meses ("Ene" … "Dic"); `anio` completa el nombre para lectores de pantalla. */
export function columnasDeMeses(anio?: number): Columna[] {
  return MESES.map((mes, i) => ({
    id: `mes-${i + 1}`,
    titulo: mes[0].toUpperCase() + mes.slice(1, 3),
    tituloCompleto: anio ? `${mes} de ${anio}` : mes,
    ancho: 120,
  }));
}

type Estilo = "normal" | "grupo" | "detalle" | "subtotal" | "total";

/** Peso y color de cada tipo de fila; `conSigno` cambia el color a "vencido" en los negativos. */
const ESTILOS: Record<Estilo, { fila: string; etiqueta: string; primera: [string, string]; resto: [string, string] }> = {
  normal: {
    fila: "group hover:bg-surface-2",
    etiqueta: "bg-surface px-4 font-normal text-fg group-hover:bg-surface-2",
    primera: ["font-semibold", "text-fg"],
    resto: ["font-normal", "text-fg-2"],
  },
  grupo: {
    fila: "group hover:bg-surface-2",
    etiqueta: "bg-surface px-4 font-semibold text-fg group-hover:bg-surface-2",
    primera: ["font-semibold", "text-fg"],
    resto: ["font-semibold", "text-fg"],
  },
  detalle: {
    fila: "group animate-fade-in hover:bg-surface-2",
    etiqueta: "bg-surface pr-4 pl-10 font-normal text-fg-2 group-hover:bg-surface-2",
    primera: ["font-normal", "text-fg-2"],
    resto: ["font-normal", "text-fg-3"],
  },
  subtotal: {
    fila: "bg-surface-2",
    etiqueta: "bg-surface-2 px-4 font-semibold text-fg",
    primera: ["font-semibold", "text-fg"],
    resto: ["font-semibold", "text-fg-2"],
  },
  total: {
    fila: "bg-surface-2",
    etiqueta: "bg-surface-2 px-4 font-bold text-fg",
    primera: ["font-bold", "text-fg"],
    resto: ["font-bold", "text-fg"],
  },
};

const CELDA = "h-10 border-b border-stroke-3 px-3 text-right whitespace-nowrap tabular-nums";
/** Primera columna: fija al desplazar a lo ancho, con sombra cuando quedan columnas ocultas a la izquierda. */
const FIJA = "sticky left-0 z-10 group-data-[desplazado]/tabla:shadow-[6px_0_8px_-6px_rgb(0_0_0/0.14)]";
/** Etiqueta de una fila; el padding horizontal lo pone cada estilo. */
export const ETIQUETA = `${FIJA} border-r border-b border-stroke-3 py-2 text-left`;
const CABECERA = "h-10 border-b border-stroke-2 px-3 text-right text-caption font-semibold";

const ColumnasContext = createContext<Columna[]>([]);

const bordeDe = (c: Columna) => (c.separador ? "border-r border-stroke-3" : "");
const fondoDe = (c: Columna) => (c.destacada ? "bg-highlight" : "");

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

/** Una fila de montos: un valor por columna, en el mismo orden. */
export function Fila({
  etiqueta,
  valores,
  estilo = "normal",
  conSigno = false,
}: {
  etiqueta: React.ReactNode;
  valores: number[];
  estilo?: Estilo;
  /** Negativos en el color de "vencido" (balances). */
  conSigno?: boolean;
}) {
  const columnas = use(ColumnasContext);
  const e = ESTILOS[estilo];
  const clase = ([peso, color]: [string, string], valor: number) => `${peso} ${conSigno && valor < 0 ? "text-overdue" : color}`;
  return (
    <tr className={e.fila}>
      <th scope="row" className={`${ETIQUETA} ${e.etiqueta}`}>
        {etiqueta}
      </th>
      {columnas.map((c, i) => (
        <Monto key={c.id} valor={valores[i] || 0} className={`${bordeDe(c)} ${fondoDe(c)} ${clase(i === 0 ? e.primera : e.resto, valores[i] || 0)}`} />
      ))}
    </tr>
  );
}

/** Título de sección ("Ingresos", "Egresos"). */
export function Seccion({ titulo }: { titulo: string }) {
  const columnas = use(ColumnasContext);
  return (
    <tr>
      <th scope="rowgroup" className={`${FIJA} border-b border-stroke-2 bg-surface px-4 pt-6 pb-2 text-left text-body-lg font-bold text-fg`}>
        {titulo}
      </th>
      <td colSpan={columnas.length} className="border-b border-stroke-2" />
    </tr>
  );
}

/** Subtítulo dentro de una sección (p. ej. "Otros ingresos", que repite nombres de las cuotas). */
export function Subseccion({ titulo }: { titulo: string }) {
  const columnas = use(ColumnasContext);
  return (
    <tr>
      <th scope="row" className={`${FIJA} border-b border-stroke-3 bg-surface px-4 pt-4 pb-1.5 text-left text-body font-semibold text-fg-2`}>
        {titulo}
      </th>
      <td colSpan={columnas.length} className="border-b border-stroke-3" />
    </tr>
  );
}

/** Fila con una acción en la primera columna ("Ver los 27 conceptos restantes"). */
export function FilaAccion({ children }: { children: React.ReactNode }) {
  const columnas = use(ColumnasContext);
  return (
    <tr className="animate-fade-in">
      <th scope="row" className={`${ETIQUETA} bg-surface pr-4 pl-8 font-normal`}>
        {children}
      </th>
      <td colSpan={columnas.length} className="border-b border-stroke-3" />
    </tr>
  );
}

/** Separación antes de la fila final (el balance). */
export function Espacio() {
  const columnas = use(ColumnasContext);
  return (
    <tr aria-hidden>
      <td colSpan={columnas.length + 1} className="h-4 border-b border-stroke-2" />
    </tr>
  );
}

export function TablaMensual({
  etiqueta = "Concepto",
  columnas,
  grupos,
  descripcion,
  region,
  pendiente = false,
  children,
}: {
  /** Encabezado de la primera columna. */
  etiqueta?: string;
  columnas: Columna[];
  grupos?: GrupoColumnas[];
  /** Título de la tabla para lectores de pantalla. */
  descripcion: string;
  /** Nombre del área que se desplaza a lo ancho. */
  region: string;
  /** Cargando otro periodo: la tabla se atenúa. */
  pendiente?: boolean;
  children: React.ReactNode;
}) {
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

  const destacada = columnas.findIndex((c) => c.destacada);
  const inicioDestacada = columnas.slice(0, Math.max(destacada, 0)).reduce((suma, c) => suma + c.ancho, 0);
  const finDestacada = destacada < 0 ? 0 : inicioDestacada + columnas[destacada].ancho;
  const primeraVez = useRef(true);
  useEffect(() => {
    const cuerpo = cuerpoRef.current;
    const marco = marcoRef.current;
    if (!cuerpo || !marco || destacada < 0) return;
    const etiqueta = parseFloat(getComputedStyle(marco).getPropertyValue("--tm-etiqueta")) || 0;
    const visible = cuerpo.clientWidth - etiqueta;
    const fuera = inicioDestacada < cuerpo.scrollLeft || finDestacada > cuerpo.scrollLeft + visible;
    const suave = !primeraVez.current && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    primeraVez.current = false;
    if (fuera) cuerpo.scrollTo({ left: inicioDestacada, behavior: suave ? "smooth" : "auto" });
  }, [destacada, inicioDestacada, finDestacada]);

  const ancho = { width: `calc(var(--tm-etiqueta) + ${columnas.reduce((suma, c) => suma + c.ancho, 0)}px)` };
  const tabla = "min-w-full table-fixed border-separate border-spacing-0 text-body";
  const colgroup = (
    <colgroup>
      <col className="w-(--tm-etiqueta)" />
      {columnas.map((c) => (
        <col key={c.id} style={{ width: c.ancho }} />
      ))}
    </colgroup>
  );

  return (
    <div
      ref={marcoRef}
      className={`group/tabla rounded-panel border border-stroke-2 transition-opacity duration-160 ease-slack [--tm-etiqueta:180px] sm:[--tm-etiqueta:300px] ${pendiente ? "opacity-60" : ""}`}
    >
      <div
        ref={cabeceraRef}
        aria-hidden
        onWheel={(e) => {
          if (e.deltaX && cuerpoRef.current) cuerpoRef.current.scrollLeft += e.deltaX;
        }}
        className="sticky top-[52px] z-[15] overflow-hidden rounded-t-panel bg-surface lg:top-[49px]"
      >
        <table className={tabla} style={ancho}>
          {colgroup}
          <tbody>
            {grupos && (
              <tr>
                <th rowSpan={2} className={`${FIJA} border-r border-b border-stroke-2 bg-surface px-4 text-left align-bottom text-caption font-semibold text-fg-3`}>
                  <span className="flex h-10 items-center">{etiqueta}</span>
                </th>
                {grupos.map((g, i) => (
                  <th
                    key={g.titulo}
                    colSpan={g.columnas}
                    className={`h-8 border-b border-stroke-3 px-3 text-left text-caption font-semibold text-fg-2 ${i < grupos.length - 1 ? "border-r" : ""}`}
                  >
                    {g.titulo}
                  </th>
                ))}
              </tr>
            )}
            <tr>
              {!grupos && <th className={`${FIJA} h-10 border-r border-b border-stroke-2 bg-surface px-4 text-left text-caption font-semibold text-fg-3`}>{etiqueta}</th>}
              {columnas.map((c) => (
                <th key={c.id} title={c.tituloCompleto} className={`${CABECERA} ${c.separador ? "border-r" : ""} ${c.destacada ? "bg-highlight text-fg" : "text-fg-3"}`}>
                  {c.titulo}
                </th>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div
        ref={cuerpoRef}
        role="region"
        aria-label={region}
        aria-busy={pendiente}
        tabIndex={0}
        onScroll={sincronizar}
        className="overflow-x-auto rounded-b-panel outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <table className={tabla} style={ancho}>
          <caption className="sr-only">{descripcion}. Un guion indica un mes sin movimientos.</caption>
          {colgroup}
          <thead className="[&_th]:h-0 [&_th]:border-0 [&_th]:p-0 [&_th]:text-[0px] [&_th]:leading-[0]">
            {grupos && (
              <tr>
                <td />
                {grupos.map((g) => (
                  <th key={g.titulo} scope="colgroup" colSpan={g.columnas}>
                    {g.titulo}
                  </th>
                ))}
              </tr>
            )}
            <tr>
              <th scope="col">{etiqueta}</th>
              {columnas.map((c) => (
                <th key={c.id} scope="col">
                  {c.tituloCompleto ?? c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <ColumnasContext value={columnas}>{children}</ColumnasContext>
        </table>
      </div>
    </div>
  );
}
