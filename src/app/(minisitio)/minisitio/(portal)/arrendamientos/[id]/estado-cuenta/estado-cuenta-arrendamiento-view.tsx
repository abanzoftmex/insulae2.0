"use client";

/**
 * Estado de cuenta de un comercio: las mismas piezas que el de propiedad (resumen con la cuenta
 * completa, movimientos y acciones) y una pestaña con los reglamentos del condominio, que el
 * arrendatario suele necesitar a la mano.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { RentalAccountStatement } from "@/modules/minisitio/infrastructure/queries/account-statement.queries";
import type { Documento } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import type { ProjectInfo, InstruccionesPago } from "@/modules/minisitio/infrastructure/queries/project.queries";
import type { TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioSession } from "@/components/minisitio/session-provider";
import { buttonClass } from "@/components/minisitio/ui/button";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { UnderlineTabs } from "@/components/minisitio/ui/tabs";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import { toast } from "@/stores/minisitio-toast.store";
import { useDisplayTimeZone } from "@/app/(minisitio)/minisitio/(portal)/_lib/client-dates";
import { statementFileName } from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-utils";
import { DocumentList } from "@/app/(minisitio)/minisitio/(portal)/_components/document-list";
import { CreateTicketModal } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/create-ticket-modal";
import { ComoPagar } from "@/app/(minisitio)/minisitio/(portal)/_components/como-pagar";
import { SendStatementEmailModal, useStatementEmail } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/send-email-modal";
import { StatementActions, StatementMovements, StatementSummary } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/statement-parts";
import { buildRentalStatementPdf } from "./rental-statement-pdf";

interface EstadoCuentaArrendamientoViewProps {
  id: string;
  /** `null` si el arrendamiento no es del condómino o no se pudo cargar (ver `loadFailed`). */
  statement: RentalAccountStatement | null;
  /** La consulta falló (no es lo mismo que no encontrarlo). */
  loadFailed: boolean;
  /** Datos del proyecto para el PDF (logo y nombre); `null` si no se pudieron cargar. */
  proyecto: ProjectInfo | null;
  departments: TicketDepartment[];
  reglamentos: Documento[];
  reglamentosError: string;
  /** "Cómo pagar"; `null` si la administración no lo ha publicado o no se pudo cargar. */
  pago: InstruccionesPago | null;
}

export function EstadoCuentaArrendamientoView({ statement, loadFailed, ...rest }: EstadoCuentaArrendamientoViewProps) {
  if (!statement) {
    return (
      <div className="mx-auto w-full max-w-[1040px]">
        {loadFailed ? (
          <LoadError what="el estado de cuenta" />
        ) : (
          <div className="py-12 text-center">
            <p className="text-body text-fg-2">No encontramos este estado de cuenta entre tus comercios.</p>
            <Link href={msPath("/arrendamientos")} className={buttonClass("outline", "sm", "mt-3")}>
              Ir a Mis comercios
            </Link>
          </div>
        )}
      </div>
    );
  }
  return <EstadoCuentaComercio statement={statement} {...rest} />;
}

function EstadoCuentaComercio({
  id,
  statement,
  proyecto,
  departments,
  reglamentos,
  reglamentosError,
  pago,
}: Omit<EstadoCuentaArrendamientoViewProps, "statement" | "loadFailed"> & { statement: RentalAccountStatement }) {
  const { arrendamiento, estadoCuenta } = statement;
  const { user } = useMinisitioSession();
  const timeZone = useDisplayTimeZone();
  const [tab, setTab] = useState<"estado" | "reglamentos">("estado");
  const [generando, setGenerando] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [pagar, setPagar] = useState(false);
  const setPageData = useMinisitioLayoutStore((state) => state.setPageData);
  const nombre = arrendamiento.nombre_comercio || "Comercio";

  useEffect(() => {
    setPageData({
      title: "Estado de cuenta",
      breadcrumbs: [
        { label: "Mis comercios", href: msPath("/arrendamientos") },
        { label: nombre, href: msPath(`/arrendamientos/${id}`) },
      ],
    });
  }, [nombre, id, setPageData]);

  const descargar = async () => {
    setGenerando(true);
    try {
      const doc = await buildRentalStatementPdf({ arrendamiento, estadoCuenta, proyecto });
      doc.save(statementFileName(nombre));
    } catch (error) {
      console.error("[minisitio] PDF del estado de cuenta del comercio:", error);
      toast("No se pudo generar el PDF. Inténtalo otra vez.", "error");
    } finally {
      setGenerando(false);
    }
  };

  const email = useStatementEmail({
    userEmail: user?.email,
    generatePdf: async () => {
      try {
        return (await buildRentalStatementPdf({ arrendamiento, estadoCuenta, proyecto })).output("blob");
      } catch (error) {
        console.error("[minisitio] PDF para correo:", error);
        return null;
      }
    },
    propertyName: nombre,
    userName: [user?.nombre, user?.apaterno, user?.amaterno].filter(Boolean).join(" ") || "Usuario",
  });

  const datos = [arrendamiento.area_nombre, arrendamiento.razon_social_comercio !== nombre && arrendamiento.razon_social_comercio].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-title font-bold text-fg">{nombre}</p>
          {datos.length > 0 && <p className="text-body text-fg-3">{datos.join(" · ")}</p>}
        </div>
        {tab === "estado" && (
          <StatementActions
            onPdf={descargar}
            generating={generando}
            onEmail={email.openEmailModal}
            sending={email.sendingEmail}
            onHelp={() => setAyuda(true)}
            onPay={pago ? () => setPagar(true) : undefined}
            destacarPago={estadoCuenta.saldoPendiente > 0}
          />
        )}
      </div>

      <UnderlineTabs
        label="Secciones del estado de cuenta"
        value={tab}
        onChange={setTab}
        layoutId="ec-comercio-tab"
        className="mb-5 border-b border-stroke-3"
        options={[
          { id: "estado", label: "Estado de cuenta" },
          { id: "reglamentos", label: "Reglamentos", count: reglamentos.length },
        ]}
      />

      <div role="tabpanel" aria-label={tab === "estado" ? "Estado de cuenta" : "Reglamentos"}>
        {tab === "estado" ? (
          <>
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
          </>
        ) : (
          <DocumentList documentos={reglamentos} failed={Boolean(reglamentosError)} />
        )}
      </div>

      {pago && <ComoPagar open={pagar} onClose={() => setPagar(false)} info={pago} unidad={arrendamiento.area_nombre} movimientos={estadoCuenta.movimientos} />}
      <SendStatementEmailModal variant="arrendamiento" subjectName={nombre} userEmail={user?.email} state={email} />
      <CreateTicketModal open={ayuda} onClose={() => setAyuda(false)} departments={departments} defaultAsunto={`Duda sobre el estado de cuenta de ${nombre}`} />
    </div>
  );
}
