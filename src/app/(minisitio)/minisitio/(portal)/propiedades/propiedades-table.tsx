"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, FileText } from "lucide-react";
import { StatusBadge } from "@/components/minisitio/status-badge";
import { msPath } from "@/components/minisitio/paths";
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
  const [tooltip, setTooltip] = useState({ show: false, text: "", x: 0, y: 0 });

  const showTooltip = (e: React.MouseEvent<HTMLElement>, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      text: text,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const hideTooltip = () => {
    setTooltip({ show: false, text: "", x: 0, y: 0 });
  };

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

  // Obtener clase CSS según el tipo
  const getRowClass = (tipo: TipoPropiedad) => {
    switch (tipo) {
      case "fusion":
        return "bg-white"; // sepCol1 - blanco
      case "padre-sin-hijos":
        return "bg-white"; // sepCol2 - blanco
      case "padre-con-hijos":
        return "bg-yellow-100"; // sepCol3 - amarillo más visible
      case "hijo":
        return "bg-white"; // sepCol4 - blanco (sin color turquesa)
      default:
        return "bg-white";
    }
  };

  // Obtener prefijo según el tipo
  const getPrefix = (tipo: TipoPropiedad) => {
    return tipo === "hijo" ? "FAP:" : "AP:";
  };

  // Obtener separador superior según el tipo
  const getSeparatorClass = (tipo: TipoPropiedad) => {
    // Solo las fusiones y padres llevan línea divisoria azul
    if (tipo === "fusion" || tipo === "padre-sin-hijos" || tipo === "padre-con-hijos") {
      return "border-t-[2px] border-[#00754A]";
    }
    return "";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden relative">
      {/* Tooltip personalizado */}
      {tooltip.show && (
        <div
          className="fixed z-50 px-3 py-2 text-sm text-white bg-brand-deep rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            maxWidth: "300px",
            whiteSpace: "normal",
            wordBreak: "break-word",
          }}
        >
          {tooltip.text}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 -bottom-1"
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid #1E3932",
            }}
          />
        </div>
      )}

      <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-canvas border-b border-line sticky top-0 z-10">
            <tr>
              <th className="text-left py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider w-24">
                Área Privativa
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider w-28">
                Superficie
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider w-28">
                M² Construcción
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider w-24">
                Indiviso
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider w-28">
                Indiviso FAP/Cond.
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider w-40">
                Saldo Vencido al {fechaAyer({ day: "2-digit", month: "short" })}
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider w-32">
                Saldo Pendiente
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider w-24">
                Estado
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider w-32">
                Barrio
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider min-w-64">
                Uso de Suelo
              </th>
              <th className="text-center py-4 px-6 text-xs font-bold text-brand uppercase tracking-wider w-24">
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

                return (
                  <tr
                    key={`${propiedad.id_areas_privativas}-${propiedad.tipo}`}
                    className={`hover:bg-brand-mint/30 transition-colors ${rowClass} ${separatorClass}`}
                  >
                    <td className={`py-4 px-6 ${esFAP ? "pl-12" : ""}`}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          <span className="font-bold text-[#00754A]">{prefix}</span> {propiedad.nombre}
                        </div>
                        <div className="text-sm text-gray-500">{propiedad.iniciales}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 w-28">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 font-medium truncate">{formatM2(propiedad.m2_totales)}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 w-28">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 font-medium truncate">{formatM2(propiedad.m2_construccion)}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 w-24">
                      {propiedad.indiviso !== null ? (
                        <span className="text-sm font-medium text-gray-900">
                          {(parseNum(propiedad.indiviso) || 0).toFixed(4)}%
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">0.0000%</span>
                      )}
                    </td>
                    <td className="py-4 px-6 w-28">
                      {propiedad.indiviso_fap_condominio !== null ? (
                        <span className="text-sm font-medium text-blue-600">
                          {propiedad.indiviso_fap_condominio.toFixed(4)}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium truncate ${
                            (parseNum(propiedad.saldo_vencido) || 0) > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {formatCurrency(propiedad.saldo_vencido || 0)}
                        </div>
                        <div className="text-xs mt-1">
                          {(parseNum(propiedad.saldo_vencido) || 0) > 0 ? (
                            <span className="text-red-500 font-medium">Vencido</span>
                          ) : (
                            <span className="text-green-500">Al corriente</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium truncate ${
                            (parseNum(propiedad.saldo_pendiente) || 0) - (parseNum(propiedad.saldo_vencido) || 0) > 0
                              ? "text-yellow-600"
                              : "text-gray-600"
                          }`}
                        >
                          {formatCurrency(
                            Math.max(0, (parseNum(propiedad.saldo_pendiente) || 0) - (parseNum(propiedad.saldo_vencido) || 0)),
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">No vencido</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 w-24">
                      <StatusBadge
                        status={
                          getFinancialStatusBadge
                            ? getFinancialStatusBadge(propiedad.estado_saldo)
                            : getStatusBadge(propiedad.id_cat_status)
                        }
                        type="payment"
                      />
                    </td>
                    <td className="py-4 px-6 max-w-32">
                      <div
                        className="min-w-0"
                        onMouseEnter={(e) => showTooltip(e, propiedad.zona || "Sin barrio")}
                        onMouseLeave={hideTooltip}
                      >
                        <div className="text-sm text-gray-900 truncate cursor-help">{propiedad.zona || "Sin barrio"}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="min-w-0" onMouseLeave={hideTooltip}>
                        <div className="text-sm text-gray-900 whitespace-normal break-words">
                          {propiedad.uso_suelo || "Sin uso definido"}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 w-24">
                      <div className="flex justify-center space-x-2">
                        <Link
                          href={msPath(`/propiedades/${propiedad.id_areas_privativas}`)}
                          className="inline-flex items-center p-2 text-primary-dark hover:text-primary-light hover:bg-canvas rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={msPath(`/propiedades/${propiedad.id_areas_privativas}/estado-cuenta`)}
                          className="inline-flex items-center p-2 text-gray-600 hover:text-primary-light hover:bg-canvas rounded-lg transition-colors"
                          title="Estado de cuenta"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              }),
            )}
            <tr className="bg-canvas border-t-2 border-brand/20 sticky bottom-0">
              <td className="py-4 px-6 font-bold text-gray-900">TOTAL</td>
              <td className="py-4 px-6 w-28">
                <span className="text-sm font-bold text-gray-900">{formatM2(tableTotals.superficie)}</span>
              </td>
              <td className="py-4 px-6 w-28">
                <span className="text-sm font-bold text-gray-900">{formatM2(tableTotals.m2Construccion)}</span>
              </td>
              <td className="py-4 px-6 w-24">
                <span className="text-sm font-bold text-gray-900">{tableTotals.indiviso.toFixed(4)}%</span>
              </td>
              <td className="py-4 px-6 w-28">
                <span className="text-sm font-bold text-blue-700">{tableTotals.indivisoFapCondominio.toFixed(4)}%</span>
              </td>
              <td className="py-4 px-6">
                <span className="text-sm font-bold text-red-700">{formatCurrency(tableTotals.saldoVencido)}</span>
              </td>
              <td className="py-4 px-6">
                <span className="text-sm font-bold text-yellow-700">{formatCurrency(tableTotals.saldoPendienteNoVencido)}</span>
              </td>
              <td className="py-4 px-6 w-24">
                <span className="text-xs font-semibold text-gray-600">—</span>
              </td>
              <td className="py-4 px-6 w-32">
                <span className="text-xs font-semibold text-gray-600">—</span>
              </td>
              <td className="py-4 px-6 min-w-64">
                <span className="text-xs font-semibold text-gray-600">—</span>
              </td>
              <td className="py-4 px-6 w-24">
                <span className="text-xs font-semibold text-gray-600">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PropiedadesTable;
