import type { TicketDepartmentListing } from "../domain/ticket-department";

export interface TicketDepartmentRowVM {
  id: string;
  name: string;
  email: string;
  ticketsCountLabel: string;
  canDelete: boolean;
  workloadLevel: "none" | "low" | "high";
}

export interface TicketDepartmentListingVM {
  title: string;
  subtitle: string;
  total: number;
  rows: TicketDepartmentRowVM[];
}

function toWorkloadLevel(ticketsCount: number): "none" | "low" | "high" {
  if (ticketsCount <= 0) {
    return "none";
  }

  if (ticketsCount <= 4) {
    return "low";
  }

  return "high";
}

export function toTicketDepartmentListingVM(listing: TicketDepartmentListing): TicketDepartmentListingVM {
  return {
    title: "Departamentos de tickets",
    subtitle: `Canales de atencion para ${listing.condominiumName}.`,
    total: listing.rows.length,
    rows: listing.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      ticketsCountLabel: `${row.ticketsCount} ${row.ticketsCount === 1 ? "ticket" : "tickets"}`,
      canDelete: row.canDelete,
      workloadLevel: toWorkloadLevel(row.ticketsCount),
    })),
  };
}
