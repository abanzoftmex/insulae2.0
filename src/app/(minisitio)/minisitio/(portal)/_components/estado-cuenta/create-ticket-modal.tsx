"use client";

/** "¿Algo no cuadra?" desde los estados de cuenta: el diálogo compartido de nueva solicitud. */
import type { TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { NuevaSolicitud } from "../nueva-solicitud";

export function CreateTicketModal({
  open,
  onClose,
  departments,
  defaultAsunto,
}: {
  open: boolean;
  onClose: () => void;
  departments: TicketDepartment[];
  defaultAsunto?: string;
}) {
  return <NuevaSolicitud open={open} onClose={onClose} departments={departments} defaultAsunto={defaultAsunto} />;
}
