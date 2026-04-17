import type {
  SaveTicketDepartmentInput,
  TicketDepartmentCommandResult,
  TicketDepartmentFormSnapshot,
  TicketDepartmentListing,
} from "./ticket-department";

export interface TicketDepartmentRepository {
  getListing(): Promise<TicketDepartmentListing | null>;
  getById(id: string): Promise<TicketDepartmentFormSnapshot | null>;
  save(input: SaveTicketDepartmentInput): Promise<TicketDepartmentCommandResult>;
  delete(id: string): Promise<TicketDepartmentCommandResult>;
}
