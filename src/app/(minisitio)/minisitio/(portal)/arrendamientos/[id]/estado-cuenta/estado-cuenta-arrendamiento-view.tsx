"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, Plus } from "lucide-react";
import { StatusBadge } from "@/components/minisitio/status-badge";
import { msPath } from "@/components/minisitio/paths";
import { useRequireAuth } from "@/components/minisitio/use-minisitio-auth";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import type { RentalAccountStatement } from "@/modules/minisitio/infrastructure/queries/account-statement.queries";
import type { ProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import type { Documento } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import type { TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import {
  formatCurrency,
  formatDate,
  movementBadgeStatus,
  movementBalance,
  projectLogoUrl,
  statementFileName,
} from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-utils";
import { ButtonSpinner } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/button-spinner";
import { CreateTicketModal } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/create-ticket-modal";
import {
  SendStatementEmailModal,
  useStatementEmail,
} from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/send-email-modal";
import { buildRentalStatementPdf } from "./rental-statement-pdf";
import { ReglamentosTab } from "./reglamentos-tab";

interface EstadoCuentaArrendamientoViewProps {
  id: string;
  /** `null` si el arrendamiento no es del condómino o no se pudo cargar (ver `loadError`). */
  statement: RentalAccountStatement | null;
  /** Mensaje del modal de error cuando no hay estado de cuenta. */
  loadError: string | null;
  /** Datos del proyecto para el PDF (logo y nombre); `null` si no se pudieron cargar. */
  proyecto: ProjectInfo | null;
  departments: TicketDepartment[];
  reglamentos: Documento[];
  reglamentosError: string;
}

export function EstadoCuentaArrendamientoView({
  id,
  statement,
  loadError,
  proyecto,
  departments,
  reglamentos,
  reglamentosError,
}: EstadoCuentaArrendamientoViewProps) {
  const { user } = useRequireAuth();
  const arrendamiento = statement?.arrendamiento ?? null;
  const estadoCuenta = statement?.estadoCuenta ?? null;
  const [isModalOpen, setIsModalOpen] = useState(Boolean(loadError));
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState<"estado" | "reglamentos">("estado");
  const [selectedReglamentoId, setSelectedReglamentoId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const setPageData = useMinisitioLayoutStore((state) => state.setPageData);

  // Configurar el encabezado con el arrendamiento cargado
  useEffect(() => {
    if (arrendamiento) {
      setPageData({
        title: `Estado de Cuenta: ${arrendamiento.nombre_comercio || `Comercio ${arrendamiento.id_arrendamientos}`}`,
        breadcrumbs: [
          { label: "Comercios", href: msPath("/arrendamientos") },
          { label: arrendamiento.nombre_comercio, href: msPath(`/arrendamientos/${id}`) },
          { label: "Estado de Cuenta" },
        ],
      });
    }
  }, [arrendamiento, id, setPageData]);

  const generatePDF = async () => {
    if (!arrendamiento || !estadoCuenta) {
      alert("No hay datos suficientes para generar el PDF.");
      return;
    }
    setGeneratingPDF(true);
    try {
      const doc = await buildRentalStatementPdf({ arrendamiento, estadoCuenta, proyecto });
      doc.save(statementFileName(arrendamiento.nombre_comercio || "arrendamiento"));
    } catch (e) {
      console.error("Error generando PDF:", e);
      alert("Error al generar el PDF. Intenta de nuevo.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generatePDFForEmail = async (): Promise<Blob | null> => {
    if (!arrendamiento || !estadoCuenta) return null;
    try {
      // Mismo PDF que la descarga, como blob
      const doc = await buildRentalStatementPdf({ arrendamiento, estadoCuenta, proyecto });
      return doc.output("blob");
    } catch (e) {
      console.error("Error generando PDF para email:", e);
      return null;
    }
  };

  const comercioName =
    arrendamiento?.nombre_comercio || `Arrendamiento ${arrendamiento?.id_arrendamientos || ""}`;
  const email = useStatementEmail({
    userEmail: user?.email,
    generatePdf: generatePDFForEmail,
    propertyName: comercioName,
    userName: [user?.nombre, user?.apaterno, user?.amaterno].filter(Boolean).join(" ") || "Usuario",
    logoUrl: projectLogoUrl(proyecto?.logo),
  });
  const { sendingEmail } = email;

  const renderEstadoTab = () => (
    <div className="space-y-8">
      {/* Información del Comercio - Diseño Contable */}
      {arrendamiento && (
        <div className="bg-white border border-line rounded-none shadow-sm">
          <div className="bg-gray-50 px-6 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Información del Comercio</h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre Comercial</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">{arrendamiento.nombre_comercio}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Razón Social</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">{arrendamiento.razon_social_comercio || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Área</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">{arrendamiento.area_nombre || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">RFC</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">{arrendamiento.rfc || "No especificado"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">{arrendamiento.telefono || "No especificado"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">{arrendamiento.email || "No especificado"}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Últimos Pagos Realizados */}
      {estadoCuenta?.pagos && estadoCuenta.pagos.filter((pago) => pago.status === "pagado").length > 0 && (
        <div className="bg-white border border-line rounded-none shadow-sm">
          <div className="bg-gray-50 px-6 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Últimos Pagos Realizados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full divide-y divide-line">
              <thead className="bg-canvas">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line w-1/3">
                    Folio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line w-1/3">
                    Fecha de Pago
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider w-1/3">
                    Abono Realizado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {estadoCuenta.pagos
                  .filter((pago) => pago.status === "pagado")
                  .slice(0, 3)
                  .map((pago, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100 w-1/3">
                        {pago.folio || "N/A"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100 w-1/3">
                        {formatDate(pago.fecha)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-right text-gray-900 w-1/3">
                        {formatCurrency(pago.monto)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumen Financiero - Estilo Contable */}
      {estadoCuenta && (
        <div className="bg-white border border-line rounded-none shadow-sm">
          <div className="bg-gray-50 px-6 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Resumen Financiero</h3>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo Total</dt>
                <dd className="mt-1 text-2xl font-mono font-bold text-gray-900">
                  {formatCurrency(estadoCuenta.cargosTotales)}
                </dd>
              </div>
              <div className="border-l-4 border-red-500 pl-4">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo Pendiente</dt>
                <dd className="mt-1 text-2xl font-mono font-bold text-red-700">
                  {formatCurrency(Math.max(0, estadoCuenta.saldoPendiente || 0))}
                </dd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado de Cuenta Detallado - Tabla Contable */}
      {estadoCuenta?.movimientos && estadoCuenta.movimientos.length > 0 && (
        <div className="bg-white border border-line rounded-none shadow-sm">
          <div className="bg-gray-50 px-6 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Detalle de cargos y movimientos
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full divide-y divide-line">
              <thead className="bg-canvas">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line">
                    Tipo de Cuota
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line">
                    Concepto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line">
                    Fecha de Cobro
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line">
                    Fecha Límite de Pago
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line">
                    Pagado el
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line">
                    Cargo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line">
                    Abono
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line">
                    Intereses Moratorios
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line">
                    Descuento
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-line">
                    Saldo
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {estadoCuenta.movimientos.map((movimiento, index) => {
                  // Cálculo según PHP: monto - montoAbonado + intereses - descuento
                  const saldoBruto = movementBalance(movimiento);
                  const saldo = saldoBruto > 0 ? saldoBruto : 0;
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-900 border-r border-gray-100">
                        {movimiento.grupoCobro || "Arrendamiento"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-900 border-r border-gray-100 max-w-xs truncate">
                        {movimiento.concepto || "Sin concepto"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100">
                        {formatDate(movimiento.fechaPago)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100">
                        {formatDate(movimiento.fechaVigencia)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100">
                        {movimiento.fechaLiquidacion ? formatDate(movimiento.fechaLiquidacion) : "No pagado"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-right text-gray-900 border-r border-gray-100">
                        {formatCurrency(movimiento.monto)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-right text-green-700 border-r border-gray-100">
                        {formatCurrency(movimiento.montoAbonado)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-right text-yellow-700 border-r border-gray-100">
                        {formatCurrency(movimiento.intereses)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-right text-purple-700 border-r border-gray-100">
                        {formatCurrency(movimiento.descuento_aplicado || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-right text-red-700 border-r border-gray-100">
                        {formatCurrency(saldo)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <StatusBadge status={movementBadgeStatus(movimiento.id_cat_status_pago)} type="payment" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Acciones Profesionales */}
      <div className="bg-white border border-line rounded-none shadow-sm">
        <div className="bg-gray-50 px-6 py-3 border-b border-line">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Acciones</h3>
        </div>
        <div className="px-6 py-4">
          <div className="flex flex-wrap gap-3">
            <Link
              href={msPath(`/arrendamientos/${id}`)}
              className="bg-white text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-300"
            >
              ← Volver al Detalle
            </Link>
            <Link
              href={msPath("/arrendamientos")}
              className="bg-white text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-300"
            >
              📋 Todos los Arrendamientos
            </Link>
            <button
              className="text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-300 rounded-l-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={generatePDF}
              disabled={!arrendamiento || !estadoCuenta || generatingPDF}
            >
              {generatingPDF ? (
                <>
                  <ButtonSpinner className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700 inline" />
                  Generando PDF...
                </>
              ) : (
                "📄 Descargar Estado de Cuenta"
              )}
            </button>
            <button
              className="bg-gradient-to-r from-[#cba258] to-[#cba258] hover:from-[#bca065] hover:to-[#bca065] text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-4 h-4" />
              <span>Solicitar ayuda</span>
            </button>
            <button
              className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors border border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={email.openEmailModal}
              disabled={!arrendamiento || !estadoCuenta || sendingEmail}
            >
              {sendingEmail ? (
                <>
                  <ButtonSpinner className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" />
                  Enviando...
                </>
              ) : (
                "✉️ Enviar por Email"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-white border border-line rounded-xl shadow-sm">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Estado de cuenta del comercio</h2>
            <p className="text-xs text-gray-500">
              Consulta tus saldos o revisa el reglamento condominial en un solo lugar.
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("estado")}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeTab === "estado"
                  ? "bg-white text-gray-900 shadow-sm border border-line"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText className="h-4 w-4" />
              Estado de cuenta
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reglamentos")}
              className={`ml-1 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeTab === "reglamentos"
                  ? "bg-white text-gray-900 shadow-sm border border-line"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Reglamentos
            </button>
          </div>
        </div>
      </div>

      {activeTab === "estado" ? (
        renderEstadoTab()
      ) : (
        <ReglamentosTab
          reglamentos={reglamentos}
          reglamentosError={reglamentosError}
          selectedReglamentoId={selectedReglamentoId}
          onSelect={setSelectedReglamentoId}
        />
      )}

      {/* Error Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Error</h3>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-sm text-gray-600">{loadError}</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cerrar
                </button>
                <Link
                  href={msPath("/arrendamientos")}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ir a Arrendamientos
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para enviar PDF por email */}
      <SendStatementEmailModal variant="arrendamiento" subjectName={comercioName} userEmail={user?.email} state={email} />

      {/* Avisos y modal de "Solicitar ayuda" */}
      <CreateTicketModal open={showCreateForm} onClose={() => setShowCreateForm(false)} departments={departments} />
    </div>
  );
}
