export interface TicketDepartmentListItem {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  ticketsCount: number;
  canDelete: boolean;
}

export interface TicketDepartmentListing {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  rows: TicketDepartmentListItem[];
}

export interface TicketDepartmentFormSnapshot {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
}

export interface SaveTicketDepartmentInput {
  id?: string;
  name: string;
  email: string;
  whatsapp?: string | null;
}

export interface TicketDepartmentCommandResult {
  ok: boolean;
  message: string;
  departmentId?: string;
}
