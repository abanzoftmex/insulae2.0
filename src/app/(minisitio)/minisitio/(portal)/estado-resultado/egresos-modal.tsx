"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { X, Download, Loader } from "lucide-react";
import { getEstadoResultadoEgresosConceptosAction } from "../../_actions/reports";

/** Concepto de una opción de egreso (sub-opciones del estado de resultados). */
interface ConceptoEgreso {
  id: string;
  nombre: string;
  totalAnual: number;
  meses: Record<number, number>;
}

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

/** Antes `components/EgresosModal.js` (GET /api/estado-resultado-egresos-conceptos). */
export function EgresosModal({
  isOpen,
  onClose,
  opcionId,
  opcionNombre,
  anio,
}: {
  isOpen: boolean;
  onClose: () => void;
  opcionId: string | null;
  opcionNombre: string;
  anio: number;
}) {
  const [loading, setLoading] = useState(false);
  const [conceptos, setConceptos] = useState<ConceptoEgreso[]>([]);
  const [opcionInfo, setOpcionInfo] = useState<{ nombre?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConceptos = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getEstadoResultadoEgresosConceptosAction(opcionId, anio || new Date().getFullYear());

      setConceptos((data.conceptos || []) as ConceptoEgreso[]);
      setOpcionInfo(data.opcion);
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
    if (isOpen && opcionId) {
      onOpen();
    }
  }, [isOpen, opcionId, anio]);

  const exportarDatos = () => {
    if (conceptos.length === 0) return;

    const datos = conceptos.map((concepto) => {
      const fila: Record<string, string | number> = {
        Concepto: concepto.nombre,
        "Total Anual": concepto.totalAnual,
      };

      meses.forEach((mes, idx) => {
        fila[mes] = concepto.meses[idx + 1] || 0;
      });

      return fila;
    });

    const headers = Object.keys(datos[0]).join(",");
    const rows = datos.map((fila) => Object.values(fila).join(",")).join("\n");
    const csv = headers + "\n" + rows;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = 'conceptos_' + (opcionNombre?.replace(/\s+/g, "_") || 'datos') + '_' + anio + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Sub-opciones (Conceptos)
            </h2>
            <p className="text-base text-gray-700 mt-1">
              {opcionNombre}
            </p>
            {!loading && conceptos.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {conceptos.length} concepto(s) - Total: {formatCurrency(conceptos.reduce((sum, c) => sum + c.totalAnual, 0))}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {!loading && conceptos.length > 0 && (
              <button
                onClick={exportarDatos}
                className="bg-success text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm transition-colors"
              >
                <Download className="w-4 h-4 mr-2"/>
                Exportar CSV
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 transition-colors"
            >
              <X className="w-6 h-6"/>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-brand mr-3"/>
              <span className="text-gray-600">Cargando conceptos...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-surface-2 border border-stroke-2 rounded-lg p-6 max-w-md mx-auto">
                <div className="text-overdue mb-4">Error: {error}</div>
                <button
                  onClick={fetchConceptos}
                  className="bg-overdue text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : conceptos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                No se encontraron conceptos con gastos para esta opción
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Año {anio}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-canvas sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand sticky left-0 bg-gray-50">
                      Concepto
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-brand">
                      Total Anual
                    </th>
                    {meses.map((mes, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 text-right text-xs font-semibold text-brand whitespace-nowrap"
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
                      className={idx % 2 === 0 ?"bg-white hover:bg-gray-50":"bg-gray-50 hover:bg-gray-100"}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium sticky left-0 bg-inherit">
                        {concepto.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-gray-900">
                        {formatCurrency(concepto.totalAnual)}
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
                        <td
                          key={mes}
                          className="px-4 py-3 text-sm text-right tabular-nums text-gray-700"
                        >
                          {formatCurrency(concepto.meses[mes])}
                        </td>
                      ))}
                    </tr>
                  ))}

                  <tr className="bg-surface-2 font-semibold border-t-2 border-stroke-2">
                    <td className="px-4 py-4 text-sm text-overdue sticky left-0 bg-surface-2">
                      Total General
                    </td>
                    <td className="px-4 py-4 text-base text-right tabular-nums font-bold text-overdue">
                      {formatCurrency(conceptos.reduce((sum, c) => sum + c.totalAnual, 0))}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => {
                      const totalMes = conceptos.reduce((sum, c) => sum + (c.meses[mes] || 0), 0);
                      return (
                        <td
                          key={mes}
                          className="px-4 py-4 text-sm text-right tabular-nums font-semibold text-overdue"
                        >
                          {formatCurrency(totalMes)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-line px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Año {anio} - {opcionInfo?.nombre || opcionNombre}
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
