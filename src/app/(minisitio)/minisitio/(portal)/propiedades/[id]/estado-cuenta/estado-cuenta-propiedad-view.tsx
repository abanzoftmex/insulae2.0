"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { LegacyCard } from "@/components/minisitio/legacy-card";
import { StatusBadge } from "@/components/minisitio/status-badge";
import { msPath } from "@/components/minisitio/paths";
import { useRequireAuth } from "@/components/minisitio/use-minisitio-auth";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import type { PropertyAccountStatement } from "@/modules/minisitio/infrastructure/queries/account-statement.queries";
import type { TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import {
  formatCurrency,
  formatDate,
  movementBadgeStatus,
  movementBalance,
  projectLogoUrl,
  sancionArticulo,
  statementFileName,
} from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-utils";
import { ButtonSpinner } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/button-spinner";
import { CreateTicketModal } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/create-ticket-modal";
import {
  SendStatementEmailModal,
  useStatementEmail,
} from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/send-email-modal";
import { buildPropertyStatementPdf } from "./property-statement-pdf";

interface EstadoCuentaPropiedadViewProps {
  id: string;
  /** `null` si la propiedad no es del condómino o no se pudo cargar. */
  statement: PropertyAccountStatement | null;
  departments: TicketDepartment[];
}

export function EstadoCuentaPropiedadView({ id, statement, departments }: EstadoCuentaPropiedadViewProps) {
  if (!statement) {
    return (
      <div>
        <LegacyCard>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Error al cargar el estado de cuenta</p>
            <Link href={msPath("/propiedades")} className="text-blue-600 hover:text-blue-800">
              Volver a Propiedades
            </Link>
          </div>
        </LegacyCard>
      </div>
    );
  }
  return <EstadoCuentaPropiedad id={id} statement={statement} departments={departments} />;
}

function EstadoCuentaPropiedad({
  id,
  statement,
  departments,
}: {
  id: string;
  statement: PropertyAccountStatement;
  departments: TicketDepartment[];
}) {
  const { propiedad, estadoCuenta, proyecto } = statement;
  const { user } = useRequireAuth();
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const setPageData = useMinisitioLayoutStore((state) => state.setPageData);

  // Configurar el encabezado con la propiedad cargada
  useEffect(() => {
    setPageData({
      title: `Estado de Cuenta: ${propiedad.nombre}`,
      breadcrumbs: [
        { label: "Propiedades", href: msPath("/propiedades") },
        { label: propiedad.nombre, href: msPath(`/propiedades/${id}`) },
        { label: "Estado de Cuenta" },
      ],
    });
  }, [propiedad, id, setPageData]);

  const pdfInput = { propiedad, estadoCuenta, proyecto, user };

  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = await buildPropertyStatementPdf(pdfInput, "download");
      doc.save(statementFileName(propiedad.nombre));
      setGeneratingPDF(false);
    } catch (error) {
      console.error("Error generando PDF con jsPDF:", error);
      alert("Error al generar el PDF. Por favor, inténtalo de nuevo.");
      setGeneratingPDF(false);
    }
  };

  const generatePDFForEmail = async (): Promise<Blob | null> => {
    try {
      const doc = await buildPropertyStatementPdf(pdfInput, "email");
      // Convertir a blob para enviar por email
      return doc.output("blob");
    } catch (error) {
      console.error("Error generando PDF para email:", error);
      return null;
    }
  };

  const email = useStatementEmail({
    userEmail: user?.email,
    generatePdf: generatePDFForEmail,
    propertyName: propiedad.nombre,
    // El usuario de sesión nunca tuvo `name`: el minisitio siempre mandaba "Usuario".
    userName: "Usuario",
    logoUrl: projectLogoUrl(proyecto.logo),
  });
  const { sendingEmail } = email;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="space-y-8">
        {/* Información de la Propiedad - Diseño Contable */}
        <div className="bg-white border border-line rounded-none shadow-sm">
          <div className="bg-gray-50 px-6 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Información de la Propiedad</h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Propiedad</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">{propiedad.nombre}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">M² Totales</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">
                  {/* Locale fijo: el primer HTML sale del servidor y debe coincidir al hidratar. */}
                  {(propiedad.m2_totales || 0).toLocaleString("es-MX")} m²
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">% Indiviso</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">
                  {(parseFloat(String(propiedad.indiviso)) || 0).toFixed(4)}%
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Resumen Financiero - Estilo Contable */}
        <div className="bg-white border border-line rounded-none shadow-sm">
          <div className="bg-gray-50 px-6 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Resumen Financiero</h3>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cargos Totales</dt>
                <dd className="mt-1 text-2xl font-mono font-bold text-gray-900">
                  {formatCurrency(estadoCuenta.cargosTotales)}
                </dd>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo a Favor</dt>
                <dd className="mt-1 text-2xl font-mono font-bold text-green-700">
                  {formatCurrency(estadoCuenta.saldoAFavor || 0)}
                </dd>
              </div>
              <div className="border-l-4 border-red-500 pl-4">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo Pendiente</dt>
                <dd className="mt-1 text-2xl font-mono font-bold text-red-700">
                  {formatCurrency(estadoCuenta.saldoPendiente)}
                </dd>
              </div>
            </div>

            {estadoCuenta.descuentos > 0 && (
              <div className="mt-6 pt-6 border-t border-line">
                <div className="border-l-4 border-purple-500 pl-4">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Descuentos Aplicados</dt>
                  <dd className="mt-1 text-2xl font-mono font-bold text-purple-700">
                    {formatCurrency(estadoCuenta.descuentos)}
                  </dd>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Estado de Cuenta Detallado - Tabla Contable */}
        {estadoCuenta.movimientos.length > 0 && (
          <div className="bg-white border border-line rounded-none shadow-sm">
            <div className="bg-gray-50 px-6 py-3 border-b border-line">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Detalle de Estado de Cuenta</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
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
                    const articulo = sancionArticulo(movimiento);
                    // Lógica de saldo: positivo = deuda; solo se muestra deuda, no saldos a favor
                    const saldoBruto = movementBalance(movimiento);
                    const saldo = saldoBruto > 0 ? saldoBruto : 0;
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-900 border-r border-gray-100">
                          {movimiento.grupoCobro || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900 border-r border-gray-100 max-w-xs">
                          <div>
                            <div className="truncate">{movimiento.concepto || "Sin concepto"}</div>
                            {articulo && <div className="text-[10px] text-red-600 italic mt-1">{articulo}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100">
                          {formatDate(movimiento.fechaPago)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100">
                          {formatDate(movimiento.fechaVigencia)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100">
                          {formatDate(movimiento.fechaLiquidacion)}
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
                          {formatCurrency(movimiento.descuento_aplicado)}
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

        {/* Historial de Pagos - Tabla Contable */}
        {estadoCuenta.historialPagos.length > 0 && (
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
                  {estadoCuenta.historialPagos.map((pago, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100 w-1/3">
                        {pago.folio || "N/A"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100 w-1/3">
                        {formatDate(pago.fechaPago)}
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

        {/* Acciones Profesionales */}
        <div className="bg-white border border-line rounded-none shadow-sm">
          <div className="bg-gray-50 px-6 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Acciones</h3>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-3">
              <Link
                href={msPath(`/propiedades/${id}`)}
                className="bg-white rounded-md text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-300"
              >
                ← Volver al Detalle
              </Link>
              <Link
                href={msPath("/propiedades")}
                className="bg-white rounded-md text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-300"
              >
                📋 Todas las Propiedades
              </Link>
              <button
                className="text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={generatePDF}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <>
                    <ButtonSpinner className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" />
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
                className="bg-primary-dark rounded-md text-white px-4 py-2 text-sm font-medium hover:bg-primary-light transition-colors border border-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={email.openEmailModal}
                disabled={generatingPDF || sendingEmail}
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

      {/* Modal para enviar PDF por email */}
      <SendStatementEmailModal variant="propiedad" subjectName={propiedad.nombre} userEmail={user?.email} state={email} />

      {/* Avisos y modal de "Solicitar ayuda" */}
      <CreateTicketModal open={showCreateForm} onClose={() => setShowCreateForm(false)} departments={departments} />
    </div>
  );
}
