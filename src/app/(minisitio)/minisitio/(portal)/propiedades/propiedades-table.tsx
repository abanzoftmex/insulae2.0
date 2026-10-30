"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Eye, FileText } from "lucide-react";
import { StatusBadge } from "@/components/minisitio/status-badge";
import { msPath } from "@/components/minisitio/paths";
import { Tooltip } from "@/components/minisitio/tooltip";
import { agruparPorBarrio, organizarPropiedadesHierarquicamente, type TipoPropiedad } from "./propiedades-organizer";
import { fechaAyer, parseNum, type PropiedadView } from "./propiedades-format";

interface PropiedadesTableProps {
  propiedades: PropiedadView[];
  formatCurrency: (amount: number | null | undefined) => string;
  formatM2: (m2: unknown) => string;
  getStatusBadge: (statusId: number) => number;
  getFinancialStatusBadge?: (estadoSaldo: string) => number;
}

/** Tabla de propiedades (antes `components/PropiedadesTable.js`). */
export function PropiedadesTable({
  propiedades,
  formatCurrency,
  formatM2,
  getStatusBadge,
  getFinancialStatusBadge,
}: PropiedadesTableProps) {
  // Organizar propiedades según la estructura del sitio anterior
  // Orden: Fusiones → AP → FAPs, respetando el campo ordenamiento
  const organizarPropiedades = useMemo(() => {
    return organizarPropiedadesHierarquicamente(propiedades);
  }, [propiedades]);

  // Agrupar por barrio, manteniendo el orden de aparición
  const agruparPorBarrioData = useMemo(() => {
    return agruparPorBarrio(organizarPropiedades);
  }, [organizarPropiedades]);

  const tableTotals = useMemo(() => {
    return organizarPropiedades.reduce(
      (acc, propiedad) => {
        const m2Totales = parseNum(propiedad.m2_totales) || 0;
        const m2Construccion = parseNum(propiedad.m2_construccion) || 0;
        const indiviso = parseNum(propiedad.indiviso) || 0;
        const indivisoFapCondominio = parseNum(propiedad.indiviso_fap_condominio) || 0;
        const saldoVencido = parseNum(propiedad.saldo_vencido) || 0;
        const saldoPendiente = parseNum(propiedad.saldo_pendiente) || 0;

        acc.superficie += m2Totales;
        acc.m2Construccion += m2Construccion;
        acc.indiviso += indiviso;
        acc.indivisoFapCondominio += indivisoFapCondominio;
        acc.saldoVencido += saldoVencido;
        acc.saldoPendienteNoVencido += Math.max(0, saldoPendiente - saldoVencido);

        return acc;
      },
      {
        superficie: 0,
        m2Construccion: 0,
        indiviso: 0,
        indivisoFapCondominio: 0,
        saldoVencido: 0,
        saldoPendienteNoVencido: 0,
      },
    );
  }, [organizarPropiedades]);

  // Fondo de fila según el tipo (la estructura del sitio anterior: el padre con hijos resalta).
  const getRowClass = (tipo: TipoPropiedad) => (tipo === "padre-con-hijos" ? "bg-gold-soft" : "bg-card");

  // Obtener prefijo según el tipo
  const getPrefix = (tipo: TipoPropiedad) => {
    return tipo === "hijo" ? "FAP:" : "AP:";
  };

  // Las fusiones y los padres abren grupo con una línea más marcada; los FAP cuelgan de ellos.
  const getSeparatorClass = (tipo: TipoPropiedad) =>
    tipo === "fusion" || tipo === "padre-sin-hijos" || tipo === "padre-con-hijos" ? "border-t border-brand/20" : "border-t border-stroke-3";

  const th = "whitespace-nowrap px-4 py-3 text-[12px] font-semibold text-fg-3";
  const td = "px-4 py-3 text-[13.5px] text-fg tabular-nums";

  return (
    <div className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
      <div className="scrollbar-slim max-h-[calc(100vh-300px)] overflow-auto">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr className="[&>th]:border-b [&>th]:border-stroke-2">
              <th scope="col" className={`${th} sticky left-0 z-10 bg-surface-2 text-left`}>
                Área Privativa
              </th>
              <th scope="col" className={`${th} text-right`}>
                Superficie
              </th>
              <th scope="col" className={`${th} text-right`}>
                M² Construcción
              </th>
              <th scope="col" className={`${th} text-right`}>
                Indiviso
              </th>
              <th scope="col" className={`${th} text-right`}>
                Indiviso FAP/Cond.
              </th>
              <th scope="col" className={`${th} text-right`}>
                Saldo Vencido al {fechaAyer({ day: "2-digit", month: "short" })}
              </th>
              <th scope="col" className={`${th} text-right`}>
                Saldo Pendiente
              </th>
              <th scope="col" className={`${th} text-left`}>
                Estado
              </th>
              <th scope="col" className={`${th} text-left`}>
                Barrio
              </th>
              <th scope="col" className={`${th} text-left`}>
                Uso de Suelo
              </th>
              <th scope="col" className={`${th} text-center`}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {agruparPorBarrioData.ordenBarrios.map((barrio) =>
              agruparPorBarrioData.grupos[barrio].map((propiedad) => {
                const rowClass = getRowClass(propiedad.tipo);
                const prefix = getPrefix(propiedad.tipo);
                const separatorClass = getSeparatorClass(propiedad.tipo);
                const esFAP = propiedad.tipo === "hijo";
                const vencido = parseNum(propiedad.saldo_vencido) || 0;
                const noVencido = Math.max(0, (parseNum(propiedad.saldo_pendiente) || 0) - vencido);

                return (
                  <tr
                    key={`${propiedad.id_areas_privativas}-${propiedad.tipo}`}
                    className={`group ${rowClass} transition-colors duration-100 hover:bg-surface-3`}
                  >
                    <td className={`${td} ${separatorClass} sticky left-0 z-[1] min-w-[200px] bg-inherit ${esFAP ? "pl-8" : ""}`}>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="whitespace-nowrap font-medium">
                            <span className={`mr-1 text-[12px] font-semibold ${esFAP ? "text-fg-3" : "text-brand"}`}>{prefix}</span>
                            {propiedad.nombre}
                          </div>
                          {propiedad.iniciales && propiedad.iniciales !== propiedad.nombre && (
                            <div className="whitespace-nowrap text-[12.5px] text-fg-3">{propiedad.iniciales}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`${td} ${separatorClass} whitespace-nowrap text-right`}>{formatM2(propiedad.m2_totales)}</td>
                    <td className={`${td} ${separatorClass} whitespace-nowrap text-right`}>{formatM2(propiedad.m2_construccion)}</td>
                    <td className={`${td} ${separatorClass} whitespace-nowrap text-right`}>{(parseNum(propiedad.indiviso) || 0).toFixed(4)}%</td>
                    <td className={`${td} ${separatorClass} whitespace-nowrap text-right`}>
                      {propiedad.indiviso_fap_condominio !== null ? (
                        `${propiedad.indiviso_fap_condominio.toFixed(4)}%`
                      ) : (
                        <span className="text-fg-4">—</span>
                      )}
                    </td>
                    <td className={`${td} ${separatorClass} whitespace-nowrap text-right`}>
                      <div className={`font-semibold ${vencido > 0 ? "text-overdue" : "text-success"}`}>
                        {formatCurrency(propiedad.saldo_vencido || 0)}
                      </div>
                      <div className={`text-[12px] ${vencido > 0 ? "text-overdue/80" : "text-fg-3"}`}>
                        {vencido > 0 ? "Vencido" : "Al corriente"}
                      </div>
                    </td>
                    <td className={`${td} ${separatorClass} whitespace-nowrap text-right`}>
                      <div className={`font-semibold ${noVencido > 0 ? "text-warning" : "text-fg-2"}`}>{formatCurrency(noVencido)}</div>
                      <div className="text-[12px] text-fg-3">No vencido</div>
                    </td>
                    <td className={`${td} ${separatorClass}`}>
                      <StatusBadge
                        status={
                          getFinancialStatusBadge
                            ? getFinancialStatusBadge(propiedad.estado_saldo)
                            : getStatusBadge(propiedad.id_cat_status)
                        }
                        type="payment"
                      />
                    </td>
                    <td className={`${td} ${separatorClass} max-w-40`}>
                      <div className="truncate" title={propiedad.zona || "Sin barrio"}>
                        {propiedad.zona || "Sin barrio"}
                      </div>
                    </td>
                    <td className={`${td} ${separatorClass} min-w-56 text-fg-2`}>{propiedad.uso_suelo || "Sin uso definido"}</td>
                    <td className={`${td} ${separatorClass}`}>
                      <div className="flex justify-center gap-1">
                        <Tooltip title="Ver detalle" position="bottom" className="inline-flex">
                          <Link
                            href={msPath(`/propiedades/${propiedad.id_areas_privativas}`)}
                            aria-label={`Ver detalle de ${propiedad.nombre}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand outline-none transition-colors duration-100 hover:bg-brand/[0.08] hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-brand/45"
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.75} />
                          </Link>
                        </Tooltip>
                        <Tooltip title="Estado de cuenta" position="bottom" className="inline-flex">
                          <Link
                            href={msPath(`/propiedades/${propiedad.id_areas_privativas}/estado-cuenta`)}
                            aria-label={`Estado de cuenta de ${propiedad.nombre}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-3 outline-none transition-colors duration-100 hover:bg-brand/[0.08] hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-brand/45"
                          >
                            <FileText className="h-4 w-4" strokeWidth={1.75} />
                          </Link>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-surface-2">
            <tr className="[&>*]:border-t [&>*]:border-stroke-2">
              <th scope="row" className={`${td} sticky left-0 z-[1] bg-surface-2 text-left font-bold`}>
                Total
              </th>
              <td className={`${td} whitespace-nowrap text-right font-bold`}>{formatM2(tableTotals.superficie)}</td>
              <td className={`${td} whitespace-nowrap text-right font-bold`}>{formatM2(tableTotals.m2Construccion)}</td>
              <td className={`${td} whitespace-nowrap text-right font-bold`}>{tableTotals.indiviso.toFixed(4)}%</td>
              <td className={`${td} whitespace-nowrap text-right font-bold`}>{tableTotals.indivisoFapCondominio.toFixed(4)}%</td>
              <td className={`${td} whitespace-nowrap text-right font-bold text-overdue`}>{formatCurrency(tableTotals.saldoVencido)}</td>
              <td className={`${td} whitespace-nowrap text-right font-bold text-warning`}>
                {formatCurrency(tableTotals.saldoPendienteNoVencido)}
              </td>
              <td className={`${td} text-fg-4`} colSpan={4}>
                <span className="sr-only">Sin total</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default PropiedadesTable;
