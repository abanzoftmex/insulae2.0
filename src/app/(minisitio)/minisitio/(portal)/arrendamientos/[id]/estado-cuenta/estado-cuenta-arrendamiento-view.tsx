"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, BookOpen, FileText } from "lucide-react";
import { BUTTON } from "@/components/minisitio/ui/list-controls";
import { msPath } from "@/components/minisitio/paths";
import { useRequireAuth } from "@/components/minisitio/use-minisitio-auth";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import type { RentalAccountStatement } from "@/modules/minisitio/infrastructure/queries/account-statement.queries";
import type { ProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import type { Documento } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import type { TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { formatCurrency, statementFileName } from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-utils";
import {
  InfoGrid,
  MovementsTable,
  PaymentsTable,
  StatementActions,
  StatementSection,
  SummaryStat,
} from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/statement-ui";
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
  const reduce = useReducedMotion();

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
  });
  const { sendingEmail } = email;

  const pagados = (estadoCuenta?.pagos ?? []).filter((pago) => pago.status === "pagado").slice(0, 3);

  const renderEstadoTab = () => (
    <div className="space-y-6">
      {/* Información del comercio */}
      {arrendamiento && (
        <StatementSection title="Información del Comercio">
          <InfoGrid
            items={[
              { label: "Nombre Comercial", value: arrendamiento.nombre_comercio },
              { label: "Razón Social", value: arrendamiento.razon_social_comercio || "N/A" },
              { label: "Área", value: arrendamiento.area_nombre || "N/A" },
              { label: "RFC", value: arrendamiento.rfc || <span className="text-fg-4">No especificado</span> },
              { label: "Teléfono", value: arrendamiento.telefono || <span className="text-fg-4">No especificado</span> },
              { label: "Email", value: arrendamiento.email || <span className="text-fg-4">No especificado</span> },
            ]}
          />
        </StatementSection>
      )}

      {/* Últimos pagos realizados */}
      {pagados.length > 0 && (
        <StatementSection title="Últimos Pagos Realizados" flush>
          <PaymentsTable pagos={pagados} />
        </StatementSection>
      )}

      {/* Resumen financiero */}
      {estadoCuenta && (
        <StatementSection title="Resumen Financiero">
          <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SummaryStat label="Saldo Total" value={formatCurrency(estadoCuenta.cargosTotales)} />
            <SummaryStat
              label="Saldo Pendiente"
              value={formatCurrency(Math.max(0, estadoCuenta.saldoPendiente || 0))}
              tone={(estadoCuenta.saldoPendiente || 0) > 0 ? "overdue" : "neutral"}
            />
          </dl>
        </StatementSection>
      )}

      {/* Detalle de cargos y movimientos */}
      {estadoCuenta?.movimientos && estadoCuenta.movimientos.length > 0 && (
        <StatementSection title="Detalle de cargos y movimientos" flush>
          <MovementsTable movimientos={estadoCuenta.movimientos} defaultGroup="Arrendamiento" unpaidLabel="No pagado" />
        </StatementSection>
      )}

      <StatementActions
        backHref={msPath(`/arrendamientos/${id}`)}
        listHref={msPath("/arrendamientos")}
        listLabel="Todos los Arrendamientos"
        onDownload={generatePDF}
        downloading={generatingPDF}
        downloadDisabled={!arrendamiento || !estadoCuenta}
        onHelp={() => setShowCreateForm(true)}
        onEmail={email.openEmailModal}
        sending={sendingEmail}
        emailDisabled={!arrendamiento || !estadoCuenta}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-stroke-2 bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-[16px] font-semibold leading-6 text-fg">Estado de cuenta del comercio</h2>
          <p className="text-[13px] leading-5 text-fg-3">Consulta tus saldos o revisa el reglamento condominial en un solo lugar.</p>
        </div>
        <div role="tablist" aria-label="Secciones del estado de cuenta" className="inline-flex rounded-[10px] bg-surface-4 p-1 ring-1 ring-inset ring-stroke-3">
          {(
            [
              { key: "estado", label: "Estado de cuenta", icon: FileText },
              { key: "reglamentos", label: "Reglamentos", icon: BookOpen },
            ] as const
          ).map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(key)}
                className={`relative flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/45 ${
                  active ? "text-brand-deep" : "text-fg-3 hover:text-fg"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="estado-cuenta-tab"
                    aria-hidden
                    className="absolute inset-0 bg-card"
                    style={{ borderRadius: 6, boxShadow: "0 1px 2px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(0 0 0 / 0.04)" }}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42, mass: 0.9 }}
                  />
                )}
                <Icon aria-hidden className="relative h-4 w-4" strokeWidth={active ? 2 : 1.75} />
                <span className="relative">{label}</span>
              </button>
            );
          })}
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

      {/* Error al cargar */}
      {isModalOpen && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/45 p-4 backdrop-blur-[2px]" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="estado-cuenta-error" className="animate-rise-in w-full max-w-md rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgb(61_60_34/0.08),0_24px_64px_-12px_rgb(61_60_34/0.4)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-critical-bg text-overdue">
                <AlertTriangle aria-hidden className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h3 id="estado-cuenta-error" className="text-[16px] font-semibold text-fg">
                  Error
                </h3>
                <p className="mt-1 text-[13.5px] leading-5 text-fg-3">{loadError}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button type="button" onClick={() => setIsModalOpen(false)} className={BUTTON.secondary}>
                Cerrar
              </button>
              <Link href={msPath("/arrendamientos")} onClick={() => setIsModalOpen(false)} className={BUTTON.primary}>
                Ir a Arrendamientos
              </Link>
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
