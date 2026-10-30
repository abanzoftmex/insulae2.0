import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getSessionInfo } from "@/modules/minisitio/application/auth.service";
import { getPropertyAccountStatement } from "@/modules/minisitio/infrastructure/queries/account-statement.queries";
import { getPaymentInstructions } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { listTicketDepartments, type TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { msPath } from "@/components/minisitio/paths";
import { EstadoCuentaPropiedadView } from "./estado-cuenta-propiedad-view";

export const metadata: Metadata = { title: "Estado de Cuenta" };

export default async function EstadoCuentaPropiedadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCondominoSession();
  const { id } = await params;

  const [statement, departments, pago] = await Promise.all([
    // null si la propiedad no es del condómino; un fallo se muestra igual que antes (tarjeta de error).
    getPropertyAccountStatement(session, id).catch((error) => {
      console.error("[minisitio] Error al cargar el estado de cuenta de la propiedad:", error);
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
    // "Cómo pagar": si falla, simplemente no se ofrece.
    getPaymentInstructions().catch((error) => {
      console.error("[minisitio] Error al cargar las instrucciones de pago:", error);
      return null;
    }),
  ]);

  if (!statement) {
    // Solo propietarios (o "ambos") tienen estados de cuenta de propiedades: el minisitio
    // mandaba a los arrendatarios al inicio. Con datos, el condómino ya tiene la propiedad
    // asignada, así que basta revisarlo cuando no los hay.
    const info = await getSessionInfo(session);
    if (info && info.user.userType !== "propietario" && info.user.userType !== "both") redirect(msPath("/"));
  }

  return <EstadoCuentaPropiedadView id={id} statement={statement} departments={departments} pago={pago} />;
}
