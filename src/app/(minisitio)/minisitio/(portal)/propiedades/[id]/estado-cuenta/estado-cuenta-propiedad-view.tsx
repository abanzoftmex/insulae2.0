"use client";

/**
 * Estado de cuenta de una propiedad: lo que se debe (vencido, por vencer, a favor) con la cuenta
 * completa, los movimientos pendientes o todos y los últimos pagos. Las acciones van arriba, a la
 * vista: PDF, correo y "¿Algo no cuadra?" (abre una solicitud con el asunto ya escrito).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PropertyAccountStatement } from "@/modules/minisitio/infrastructure/queries/account-statement.queries";
import type { TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioSession } from "@/components/minisitio/session-provider";
import { buttonClass } from "@/components/minisitio/ui/button";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import { toast } from "@/stores/minisitio-toast.store";
import { useDisplayTimeZone } from "@/app/(minisitio)/minisitio/(portal)/_lib/client-dates";
import { statementFileName } from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-utils";
import { CreateTicketModal } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/create-ticket-modal";
import { SendStatementEmailModal, useStatementEmail } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/send-email-modal";
import {
  StatementActions,
  StatementMovements,
  StatementPayments,
  StatementSummary,
} from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/statement-parts";
import { buildPropertyStatementPdf } from "./property-statement-pdf";

const m2 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

interface EstadoCuentaPropiedadViewProps {
  id: string;
  /** `null` si la propiedad no es del condómino o no se pudo cargar. */
  statement: PropertyAccountStatement | null;
  departments: TicketDepartment[];
}

export function EstadoCuentaPropiedadView({ id, statement, departments }: EstadoCuentaPropiedadViewProps) {
  if (!statement) {
    return (
      <div className="mx-auto w-full max-w-[1040px] py-12 text-center">
        <p className="text-body text-fg-2">No encontramos este estado de cuenta.</p>
        <Link href={msPath("/propiedades")} className={buttonClass("outline", "sm", "mt-3")}>
          Ir a Mis propiedades
        </Link>
      </div>
    );
  }
  return <EstadoCuentaPropiedad id={id} statement={statement} departments={departments} />;
}

function EstadoCuentaPropiedad({ id, statement, departments }: { id: string; statement: PropertyAccountStatement; departments: TicketDepartment[] }) {
  const { propiedad, estadoCuenta, proyecto } = statement;
  const { user } = useMinisitioSession();
  const timeZone = useDisplayTimeZone();
  const [generando, setGenerando] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const setPageData = useMinisitioLayoutStore((state) => state.setPageData);

  useEffect(() => {
    setPageData({
      title: "Estado de cuenta",
      breadcrumbs: [
        { label: "Mis propiedades", href: msPath("/propiedades") },
        { label: propiedad.nombre, href: msPath(`/propiedades/${id}`) },
      ],
    });
  }, [propiedad.nombre, id, setPageData]);

  const pdfInput = { propiedad, estadoCuenta, proyecto, user };

  const descargar = async () => {
    setGenerando(true);
    try {
      const doc = await buildPropertyStatementPdf(pdfInput, "download");
      doc.save(statementFileName(propiedad.nombre));
    } catch (error) {
      console.error("[minisitio] PDF del estado de cuenta:", error);
      toast("No se pudo generar el PDF. Inténtalo otra vez.", "error");
    } finally {
      setGenerando(false);
    }
  };

  const email = useStatementEmail({
    userEmail: user?.email,
    generatePdf: async () => {
      try {
        return (await buildPropertyStatementPdf(pdfInput, "email")).output("blob");
      } catch (error) {
        console.error("[minisitio] PDF para correo:", error);
        return null;
      }
    },
    propertyName: propiedad.nombre,
    // El usuario de sesión nunca tuvo `name`: el minisitio siempre mandaba "Usuario".
    userName: "Usuario",
  });

  const datos = [
    propiedad.zona && propiedad.zona !== "Sin barrio" && propiedad.zona,
    propiedad.m2_totales > 0 && `${m2.format(propiedad.m2_totales)} m²`,
    propiedad.indiviso > 0 && `indiviso ${pct.format(propiedad.indiviso)} %`,
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-title font-bold text-fg">{propiedad.nombre}</p>
          {datos.length > 0 && <p className="text-body text-fg-3">{datos.join(" · ")}</p>}
        </div>
        <StatementActions onPdf={descargar} generating={generando} onEmail={email.openEmailModal} sending={email.sendingEmail} onHelp={() => setAyuda(true)} />
      </div>

      <StatementSummary
        vencido={estadoCuenta.saldoVencido}
        pendiente={estadoCuenta.saldoPendiente}
        aFavor={estadoCuenta.saldoAFavor}
        cargos={estadoCuenta.cargosTotales}
        intereses={estadoCuenta.intereses}
        pagos={estadoCuenta.pagosRealizados}
        descuentos={estadoCuenta.descuentos}
      />
      <StatementMovements movimientos={estadoCuenta.movimientos} timeZone={timeZone} />
      <StatementPayments pagos={estadoCuenta.historialPagos} timeZone={timeZone} />

      <SendStatementEmailModal variant="propiedad" subjectName={propiedad.nombre} userEmail={user?.email} state={email} />
      <CreateTicketModal
        open={ayuda}
        onClose={() => setAyuda(false)}
        departments={departments}
        defaultAsunto={`Duda sobre el estado de cuenta de ${propiedad.nombre}`}
      />
    </div>
  );
}
