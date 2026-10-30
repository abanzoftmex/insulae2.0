"use client";

/**
 * Reporte general de adeudos del condominio (solo propietarios; información confidencial). Arriba,
 * lo vencido, lo pendiente y cuántas áreas deben. Abajo, las áreas de la que más debe a la que
 * menos, 50 por página, con lo que falta pagar de lo que vence en cada mes del año, y el resumen
 * por zona. Antes salían las 1,745 áreas de golpe (también las que no deben, con "$0.00" en
 * rojo), el estado en inglés, "Áreas con adeudos" contaba todas las áreas y, si la carga fallaba,
 * decía que todas estaban al corriente.
 */
import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import type { GeneralReport } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { buttonClass } from "@/components/minisitio/ui/button";
import { fieldBaseClass } from "@/components/minisitio/ui/field";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { Paginator } from "@/components/minisitio/ui/paginator";
import { SearchField } from "@/components/minisitio/ui/search-field";
import { StatStrip } from "@/components/minisitio/ui/stat-strip";
import { UnderlineTabs } from "@/components/minisitio/ui/tabs";
import { toast } from "@/stores/minisitio-toast.store";
import { formatCurrency, normalizeSearch } from "../_lib/format";
import { Fila, TablaMensual, columnasDeMeses, type Columna } from "../_reportes/tabla-mensual";
import { buildReporteGeneralPdf, reporteGeneralPdfFileName } from "./reporte-general-pdf";

type AreaReporte = GeneralReport["areas"][number];
type Vista = "vencido" | "saldo" | "todas";

const POR_PAGINA = 50;
const NUMEROS = Array.from({ length: 12 }, (_, i) => i + 1);
const numero = new Intl.NumberFormat("es-MX");

export function ReporteGeneralView({ report }: { report: GeneralReport | null }) {
  const [vista, setVista] = useState<Vista>("vencido");
  const [busqueda, setBusqueda] = useState("");
  const [zona, setZona] = useState("todas");
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);
  const tablaRef = useRef<HTMLDivElement>(null);

  const areas = useMemo(
    () => [...(report?.areas ?? [])].sort((a, b) => b.saldo_vencido - a.saldo_vencido || b.saldo_pendiente - a.saldo_pendiente),
    [report],
  );
  const zonas = useMemo(() => [...new Set(areas.map((a) => a.zona))].sort((a, b) => a.localeCompare(b, "es")), [areas]);

  const visibles = useMemo(() => {
    const q = normalizeSearch(busqueda.trim());
    return areas.filter(
      (a) =>
        (vista === "todas" || (vista === "vencido" ? a.saldo_vencido > 0 : a.saldo_pendiente > 0)) &&
        (zona === "todas" || a.zona === zona) &&
        (!q || [a.identificador, a.zona, a.uso_suelo, a.status].some((t) => normalizeSearch(t ?? "").includes(q))),
    );
  }, [areas, vista, zona, busqueda]);

  if (!report) return <LoadError what="el reporte general" />;

  const { estadisticas, anio } = report;
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = visibles.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const filtrar = (cambio: () => void) => {
    cambio();
    setPagina(1);
  };
  const cambiarPagina = (p: number) => {
    setPagina(p);
    tablaRef.current?.scrollIntoView({ block: "start" });
  };
  const exportar = async () => {
    setExportando(true);
    try {
      (await buildReporteGeneralPdf(visibles)).save(reporteGeneralPdfFileName());
    } catch (error) {
      console.error("[minisitio] PDF del reporte general:", error);
      toast("No se pudo generar el PDF. Inténtalo otra vez.", "error");
    } finally {
      setExportando(false);
    }
  };

  const columnas: Columna[] = [
    { id: "vencido", titulo: "Vencido", tituloCompleto: "Saldo vencido", ancho: 140, alerta: true },
    { id: "pendiente", titulo: "Pendiente", tituloCompleto: "Saldo pendiente, todos los años", ancho: 140, separador: true },
    ...columnasDeMeses(anio),
  ];
  const cuenta = (v: Vista) => areas.filter((a) => (v === "todas" ? true : v === "vencido" ? a.saldo_vencido > 0 : a.saldo_pendiente > 0)).length;
  const porZona = Object.entries(estadisticas.estadisticas_por_zona).sort(([, a], [, b]) => b.saldo_vencido - a.saldo_vencido || b.saldo_pendiente - a.saldo_pendiente);

  return (
    <div className="space-y-5">
      <p className="text-body text-fg-3">Adeudos de todas las áreas del condominio. Información confidencial: no la compartas.</p>

      <StatStrip
        label="Adeudos del condominio"
        items={[
          { id: "vencido", label: "Saldo vencido", value: formatCurrency(estadisticas.total_saldo_vencido), tone: estadisticas.total_saldo_vencido > 0 ? "overdue" : undefined },
          { id: "pendiente", label: "Saldo pendiente", value: formatCurrency(estadisticas.total_saldo_pendiente) },
          {
            id: "areas",
            label: "Áreas con saldo vencido",
            value: `${numero.format(estadisticas.areas_con_saldo_vencido)} de ${numero.format(estadisticas.total_areas)}`,
          },
        ]}
        footer={
          <>
            El pendiente incluye lo que aún no vence. {numero.format(estadisticas.areas_con_saldo)} áreas tienen algún saldo; los intereses acumulados suman{" "}
            <span className="font-semibold text-fg tabular-nums">{formatCurrency(estadisticas.total_intereses)}</span>.
          </>
        }
      />

      <div ref={tablaRef} className="scroll-mt-16 space-y-3 lg:scroll-mt-14">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-stroke-3">
          <UnderlineTabs
            label="Áreas"
            value={vista}
            onChange={(v) => filtrar(() => setVista(v))}
            layoutId="rg-vista-tab"
            options={[
              { id: "vencido" as const, label: "Con saldo vencido", count: cuenta("vencido") },
              { id: "saldo" as const, label: "Con saldo", count: cuenta("saldo") },
              { id: "todas" as const, label: "Todas", count: cuenta("todas") },
            ]}
          />
          <button type="button" onClick={exportar} disabled={exportando || visibles.length === 0} className={buttonClass("outline", "sm", "mb-1.5")}>
            <Download className="h-3.5 w-3.5" aria-hidden />
            {exportando ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <SearchField value={busqueda} onChange={(v) => filtrar(() => setBusqueda(v))} label="Buscar área" placeholder="Buscar área, zona o uso" className="min-w-0 flex-1 sm:max-w-sm" />
          <label htmlFor="rg-zona" className="sr-only">
            Zona
          </label>
          <select id="rg-zona" value={zona} onChange={(e) => filtrar(() => setZona(e.target.value))} className={`${fieldBaseClass} h-8 pr-8`}>
            <option value="todas">Todas las zonas</option>
            {zonas.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        {filas.length === 0 ? (
          <p className="py-12 text-center text-body text-fg-2">
            {busqueda || zona !== "todas" ? "Ninguna área coincide con la búsqueda." : vista === "vencido" ? "Ninguna área tiene saldo vencido." : "Ninguna área tiene saldo."}
          </p>
        ) : (
          <TablaMensual
            etiqueta="Área"
            columnas={columnas}
            grupos={[
              { titulo: "Saldo", columnas: 2 },
              { titulo: `Por pagar de lo que vence en ${anio}`, columnas: 12 },
            ]}
            descripcion={`Adeudos por área, página ${paginaActual} de ${totalPaginas}`}
            region="Adeudos por área y por mes"
          >
            <tbody>
              {filas.map((a: AreaReporte) => (
                <Fila
                  key={a.id}
                  etiqueta={
                    <>
                      <span className="block">{a.identificador}</span>
                      <span className="block text-caption text-fg-3">{[a.zona, a.status].filter(Boolean).join(" · ")}</span>
                    </>
                  }
                  valores={[a.saldo_vencido, a.saldo_pendiente, ...NUMEROS.map((m) => a.meses[m] || 0)]}
                />
              ))}
            </tbody>
          </TablaMensual>
        )}

        <Paginator page={paginaActual} totalPages={totalPaginas} totalRows={visibles.length} onPageChange={cambiarPagina} rowsLabel="áreas" />
      </div>

      {porZona.length > 1 && (
        <section aria-labelledby="rg-zonas" className="space-y-3">
          <h2 id="rg-zonas" className="text-body-lg font-bold text-fg">
            Por zona
          </h2>
          <div className="overflow-x-auto rounded-panel border border-stroke-2">
            <table className="w-full min-w-[480px] text-body">
              <thead>
                <tr className="text-caption font-semibold text-fg-3">
                  <th scope="col" className="h-10 border-b border-stroke-2 px-4 text-left">
                    Zona
                  </th>
                  <th scope="col" className="h-10 border-b border-stroke-2 px-3 text-right">
                    Áreas
                  </th>
                  <th scope="col" className="h-10 border-b border-stroke-2 px-3 text-right">
                    Vencido
                  </th>
                  <th scope="col" className="h-10 border-b border-stroke-2 px-4 text-right">
                    Pendiente
                  </th>
                </tr>
              </thead>
              <tbody>
                {porZona.map(([nombre, z]) => (
                  <tr key={nombre} className="hover:bg-surface-2">
                    <th scope="row" className="h-10 border-b border-stroke-3 px-4 text-left font-normal text-fg">
                      {nombre}
                    </th>
                    <td className="border-b border-stroke-3 px-3 text-right text-fg-2 tabular-nums">{numero.format(z.total_areas)}</td>
                    <td className={`border-b border-stroke-3 px-3 text-right font-semibold tabular-nums ${z.saldo_vencido > 0 ? "text-overdue" : "text-fg-4"}`}>
                      {z.saldo_vencido > 0 ? formatCurrency(z.saldo_vencido) : "—"}
                    </td>
                    <td className="border-b border-stroke-3 px-4 text-right font-semibold text-fg tabular-nums">{formatCurrency(z.saldo_pendiente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
