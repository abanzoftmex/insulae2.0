import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getSessionInfo } from "@/modules/minisitio/application/auth.service";
import { getRentalAccountStatement } from "@/modules/minisitio/infrastructure/queries/account-statement.queries";
import { getProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { listDocuments, type Documento } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { listTicketDepartments, type TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { msPath } from "@/components/minisitio/paths";
import { EstadoCuentaArrendamientoView } from "./estado-cuenta-arrendamiento-view";

export const metadata: Metadata = { title: "Estado de cuenta" };

export default async function EstadoCuentaArrendamientoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCondominoSession();
  const { id } = await params;

  const [statementResult, proyecto, departments, documents] = await Promise.all([
    // null si el arrendamiento no es del condómino.
    getRentalAccountStatement(session, id).then(
      (statement) => ({ statement, failed: false }),
      (error) => {
        console.error("[minisitio] Error al cargar el estado de cuenta del arrendamiento:", error);
        return { statement: null, failed: true };
      },
    ),
    // Logo y nombre del proyecto para el PDF: no es crítico (antes /api/proyecto).
    getProjectInfo().catch((error) => {
      console.error("[minisitio] Error al cargar el proyecto:", error);
      return null;
    }),
    // Departamentos del modal "Solicitar ayuda" (si fallan, el select queda vacío, como antes).
    listTicketDepartments().then(
      (data) => data.departments,
      (error): TicketDepartment[] => {
        console.error("[minisitio] Error al cargar los departamentos:", error);
        return [];
      },
    ),
    // Pestaña "Reglamentos" (antes /api/reglamentos al abrir la pestaña).
    listDocuments(session).then(
      (data) => ({ documentos: data.documentos, error: "" }),
      (error) => {
        console.error("[minisitio] Error al cargar los reglamentos:", error);
        return { documentos: [] as Documento[], error: "No se pudieron cargar los reglamentos" };
      },
    ),
  ]);

  const { statement, failed } = statementResult;
  if (!statement) {
    // Solo arrendatarios (o "ambos") tienen estados de cuenta de comercios: el minisitio
    // mandaba a los propietarios al inicio. Con datos, el comercio ya es del condómino.
    const info = await getSessionInfo(session);
    if (info && info.user.userType !== "arrendatario" && info.user.userType !== "both") redirect(msPath("/"));
  }

  return (
    <EstadoCuentaArrendamientoView
      id={id}
      statement={statement}
      loadFailed={!statement && failed}
      proyecto={proyecto}
      departments={departments}
      reglamentos={documents.documentos}
      reglamentosError={documents.error}
    />
  );
}
