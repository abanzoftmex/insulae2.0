export type TicketStatusValue = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface TicketStatusOption {
  value: TicketStatusValue;
  label: string;
}

export interface TicketListItem {
  id: string;
  ticketNumber: string;
  departmentName: string;
  residentName: string;
  openedAt: Date | null;
  title: string;
  description: string;
  status: TicketStatusValue;
}

export interface TicketListing {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  rows: TicketListItem[];
}

export interface TicketResponseFormSnapshot {
  id: string;
  ticketNumber: string;
  departmentName: string;
  residentName: string;
  residentPhone: string;
  residentEmail: string;
  openedAt: Date | null;
  title: string;
  description: string;
  response: string;
  status: TicketStatusValue;
  responseImageUrl: string;
  responseImagePath: string;
  responsePdfUrl: string;
  responsePdfPath: string;
}

export interface TicketResponseFormData {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  statusOptions: TicketStatusOption[];
  snapshot: TicketResponseFormSnapshot | null;
}

export interface SaveTicketResponseInput {
  id: string;
  response: string;
  status: TicketStatusValue;
  responseImageUrl?: string | null;
  responseImagePath?: string | null;
  responsePdfUrl?: string | null;
  responsePdfPath?: string | null;
}

export interface TicketCommandResult {
  ok: boolean;
  message: string;
  ticketId?: string;
}
