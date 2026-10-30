"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { X, Download, Loader } from "lucide-react";
import type { ExpenseConcepts } from "@/modules/minisitio/infrastructure/queries/financials.queries";
import { getExpenseConceptsAction } from "../../_actions/reports";

type Concepto = ExpenseConcepts["conceptos"][number];

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const formatCurrency = (amount: number | null | undefined) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Antes `components/ConceptosModal.js` (GET /api/conceptos-grupo): conceptos de egreso de un
 * grupo presupuestal, por mes. Igual que en el minisitio, el estado de resultados lo importa
 * pero no lo monta (el drill-down de egresos usa `EgresosModal`).
 */
export function ConceptosModal({
  isOpen,
  onClose,
  grupoId,
  grupoNombre,
  anio,
}: {
  isOpen: boolean;
  onClose: () => void;
  grupoId: string | null;
  grupoNombre: string;
  anio: number;
}) {
  const [loading, setLoading] = useState(false);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchConceptos = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getExpenseConceptsAction(grupoId ?? "", anio || new Date().getFullYear());

      setConceptos(data.conceptos || []);
    } catch (error) {
      console.error("Error cargando conceptos:", error);
      setError(error instanceof Error ? error.message : "Error desconocido");
      setConceptos([]);
    } finally {
      setLoading(false);
    }
  };

  const onOpen = useEffectEvent(() => {
    fetchConceptos();
  });

  useEffect(() => {
    if (isOpen && grupoId) {
      onOpen();
    }
  }, [isOpen, grupoId, anio]);

  const exportarDatos = () => {
    if (conceptos.length === 0) return;

    const datos = conceptos.map((concepto) => {
      const fila: Record<string, string | number> = {
        Categoria: concepto.categoria,
        Concepto: concepto.nombre,
        "Total Anual": concepto.totalAnual,
      };

      meses.forEach((mes, idx) => {
        fila[mes] = concepto.meses[idx + 1] || 0;
      });

      return fila;
    });

    const csv = [
      Object.keys(datos[0]).join(","),
      ...datos.map((fila) => Object.values(fila).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conceptos_${grupoNombre?.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Conceptos Detallados: {grupoNombre}
            </h2>
            {!loading && conceptos.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {conceptos.length} concepto(s) • Total: {formatCurrency(conceptos.reduce((sum, c) => sum + c.totalAnual, 0))}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {!loading && conceptos.length > 0 && (
              <button
                onClick={exportarDatos}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Cargando conceptos...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">❌ Error: {error}</div>
              <button
                onClick={fetchConceptos}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          ) : conceptos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                No se encontraron conceptos con gastos para este grupo
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-canvas">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-brand uppercase tracking-wider">
                      Total Anual
                    </th>
                    {meses.map((mes, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 text-right text-xs font-semibold text-brand uppercase tracking-wider whitespace-nowrap"
                      >
                        {mes}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-line">
                  {conceptos.map((concepto, idx) => (
                    <tr
                      key={concepto.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600 font-medium sticky left-0 bg-inherit z-10">
                        {concepto.categoria}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {concepto.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-gray-900">
                        {formatCurrency(concepto.totalAnual)}
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
                        <td
                          key={mes}
                          className="px-4 py-3 text-sm text-right font-mono text-gray-700"
                        >
                          {formatCurrency(concepto.meses[mes])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-3 text-sm font-semibold text-gray-900"
                    >
                      TOTAL
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono font-bold text-gray-900">
                      {formatCurrency(conceptos.reduce((sum, c) => sum + c.totalAnual, 0))}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => {
                      const totalMes = conceptos.reduce(
                        (sum, c) => sum + (c.meses[mes] || 0),
                        0
                      );
                      return (
                        <td
                          key={mes}
                          className="px-4 py-3 text-sm text-right font-mono font-semibold text-gray-900"
                        >
                          {formatCurrency(totalMes)}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
