"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileWarning } from "lucide-react";
import { BUTTON, EmptyState } from "@/components/minisitio/ui/list-controls";
import { msPath } from "@/components/minisitio/paths";
import { useRequireAuth } from "@/components/minisitio/use-minisitio-auth";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import type { PropertyAccountStatement } from "@/modules/minisitio/infrastructure/queries/account-statement.queries";
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
      <EmptyState
        icon={FileWarning}
        title="Error al cargar el estado de cuenta"
        description="No pudimos obtener los movimientos de esta propiedad. Intenta de nuevo en unos minutos."
        action={
          <Link href={msPath("/propiedades")} className={BUTTON.primary}>
            Volver a Propiedades
          </Link>
        }
      />
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
  });
  const { sendingEmail } = email;

  return (
    <div>
      <div className="space-y-6">
        {/* Información de la propiedad */}
        <StatementSection title="Información de la Propiedad">
          <InfoGrid
            items={[
              { label: "Propiedad", value: propiedad.nombre },
              // Locale fijo: el primer HTML sale del servidor y debe coincidir al hidratar.
              { label: "M² Totales", value: `${(propiedad.m2_totales || 0).toLocaleString("es-MX")} m²` },
              { label: "% Indiviso", value: `${(parseFloat(String(propiedad.indiviso)) || 0).toFixed(4)}%` },
            ]}
          />
        </StatementSection>

        {/* Resumen financiero */}
        <StatementSection title="Resumen Financiero">
          <dl className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <SummaryStat label="Cargos Totales" value={formatCurrency(estadoCuenta.cargosTotales)} />
            <SummaryStat label="Saldo a Favor" value={formatCurrency(estadoCuenta.saldoAFavor || 0)} tone="success" />
            <SummaryStat
              label="Saldo Pendiente"
              value={formatCurrency(estadoCuenta.saldoPendiente)}
              tone={estadoCuenta.saldoPendiente > 0 ? "overdue" : "neutral"}
            />
          </dl>
          {estadoCuenta.descuentos > 0 && (
            <dl className="mt-6 border-t border-stroke-3 pt-6">
              <SummaryStat label="Descuentos Aplicados" value={formatCurrency(estadoCuenta.descuentos)} tone="discount" />
            </dl>
          )}
        </StatementSection>

        {/* Detalle de movimientos */}
        {estadoCuenta.movimientos.length > 0 && (
          <StatementSection title="Detalle de Estado de Cuenta" flush>
            <MovementsTable movimientos={estadoCuenta.movimientos} defaultGroup="N/A" />
          </StatementSection>
        )}

        {/* Últimos pagos */}
        {estadoCuenta.historialPagos.length > 0 && (
          <StatementSection title="Últimos Pagos Realizados" flush>
            <PaymentsTable pagos={estadoCuenta.historialPagos.map((p) => ({ folio: p.folio, fecha: p.fechaPago, monto: p.monto }))} />
          </StatementSection>
        )}

        <StatementActions
          backHref={msPath(`/propiedades/${id}`)}
          listHref={msPath("/propiedades")}
          listLabel="Todas las Propiedades"
          onDownload={generatePDF}
          downloading={generatingPDF}
          onHelp={() => setShowCreateForm(true)}
          onEmail={email.openEmailModal}
          sending={sendingEmail}
          emailDisabled={generatingPDF}
        />
      </div>

      {/* Modal para enviar PDF por email */}
      <SendStatementEmailModal variant="propiedad" subjectName={propiedad.nombre} userEmail={user?.email} state={email} />

      {/* Avisos y modal de "Solicitar ayuda" */}
      <CreateTicketModal open={showCreateForm} onClose={() => setShowCreateForm(false)} departments={departments} />
    </div>
  );
}
