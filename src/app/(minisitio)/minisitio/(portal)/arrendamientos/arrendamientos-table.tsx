"use client";

import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import { StatusBadge } from "@/components/minisitio/status-badge";
import { msPath } from "@/components/minisitio/paths";
import { parseNum, type ArrendamientoView } from "./arrendamientos-types";

/** Tabla de comercios (antes `components/ArrendamientosTable.js`). */
export function ArrendamientosTable({ arrendamientos }: { arrendamientos: ArrendamientoView[] }) {
  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  const formatM2 = (amount: number | null | undefined) => {
    if (!amount || amount === 0) return "N/A";
    return (
      new Intl.NumberFormat("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + " m²"
    );
  };

  // Función para obtener badge de estado financiero
  const getFinancialStatusBadge = (estadoFinanciero: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      al_corriente: { color: "bg-green-100 text-green-800", text: "Al corriente" },
      pendiente: { color: "bg-yellow-100 text-yellow-800", text: "Pendiente" },
      vencido: { color: "bg-red-100 text-red-800", text: "Vencido" },
      a_favor: { color: "bg-blue-100 text-blue-800", text: "A favor" },
    };
    return statusMap[estadoFinanciero] || statusMap["al_corriente"];
  };

  // Ordenar arrendamientos por área privativa de forma ascendente
  const sortedArrendamientos = [...arrendamientos].sort((a, b) => {
    const areaA = a?.area_privativa || "";
    const areaB = b?.area_privativa || "";
    return areaA.localeCompare(areaB, "es", { numeric: true });
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-canvas border-b border-line sticky top-0 z-10">
            <tr>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-24">
                Área Privativa
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-32">
                Comercio
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-28">
                Superficie
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-28">
                M² Construcción
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-24">
                Indiviso
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-28">
                Indiviso FAP/Cond.
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-40">
                Estado Financiero (Saldo Vencido)
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-32">
                Saldo Pendiente
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-24">
                Estado
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-32">
                Barrio
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-32">
                Uso de Suelo
              </th>
              <th className="text-center py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider w-24">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sortedArrendamientos.map((arrendamiento, index) => (
              <tr key={arrendamiento?.id_arrendamientos ?? index} className="hover:bg-brand-mint/30 transition-colors">
                <td className="py-4 px-6">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{arrendamiento?.area_privativa || "N/A"}</div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{arrendamiento?.nombre_comercio || "Sin nombre"}</div>
                    <div className="text-xs text-gray-500 truncate">{arrendamiento?.razon_social_comercio || "N/A"}</div>
                  </div>
                </td>
                <td className="py-4 px-6 w-28">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 font-medium truncate">{formatM2(arrendamiento?.superficie)}</div>
                  </div>
                </td>
                <td className="py-4 px-6 w-28">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 font-medium truncate">{formatM2(arrendamiento?.m2_construccion)}</div>
                  </div>
                </td>
                <td className="py-4 px-6 w-24">
                  <span className="text-sm font-medium text-gray-900">{(parseNum(arrendamiento?.indiviso) || 0).toFixed(4)}%</span>
                </td>
                <td className="py-4 px-6 w-28">
                  {arrendamiento?.indiviso_fap_condominio !== null ? (
                    <span className="text-sm font-medium text-blue-600">
                      {parseNum(arrendamiento?.indiviso_fap_condominio).toFixed(4)}%
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        (parseNum(arrendamiento?.saldo_pendiente) || 0) > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(arrendamiento?.saldo_pendiente || 0)}
                    </div>
                    <div className="text-xs mt-1">
                      {(parseNum(arrendamiento?.saldo_vencido) || 0) > 0 ? (
                        <span className="text-red-500 font-medium">Vencido</span>
                      ) : (parseNum(arrendamiento?.saldo_pendiente) || 0) > 0 ? (
                        <span className="text-yellow-500 font-medium">Pendiente</span>
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
                        (parseNum(arrendamiento?.saldo_pendiente_no_vencido) || 0) > 0 ? "text-yellow-600" : "text-gray-600"
                      }`}
                    >
                      {formatCurrency(arrendamiento?.saldo_pendiente_no_vencido || 0)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">No vencido</div>
                  </div>
                </td>
                <td className="py-4 px-6 w-24">
                  {/* Legacy: se pasa como `status` el objeto {color, text}; StatusBadge no lo reconoce
                      y pinta "Sin estado" en todas las filas. Se conserva tal cual (ver reporte del port). */}
                  <StatusBadge
                    status={getFinancialStatusBadge(arrendamiento?.estado_financiero) as unknown as number}
                    type="payment"
                  />
                </td>
                <td className="py-4 px-6 max-w-32">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 truncate">{arrendamiento?.barrio || "Sin barrio"}</div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 whitespace-normal break-words">
                      {arrendamiento?.uso_suelo || "Sin uso definido"}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 w-24">
                  <div className="flex justify-center space-x-2">
                    <Link
                      href={msPath(`/arrendamientos/${arrendamiento?.id_arrendamientos}`)}
                      className="inline-flex items-center p-2 text-primary-dark hover:text-primary-light hover:bg-canvas rounded-lg transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      href={msPath(`/arrendamientos/${arrendamiento?.id_arrendamientos}/estado-cuenta`)}
                      className="inline-flex items-center p-2 text-gray-600 hover:text-primary-light hover:bg-canvas rounded-lg transition-colors"
                      title="Estado de cuenta"
                    >
                      <FileText className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ArrendamientosTable;
