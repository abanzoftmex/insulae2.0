import type {
  SaveTicketResponseInput,
  TicketCommandResult,
  TicketListing,
  TicketResponseFormData,
} from "./ticket";

export interface TicketRepository {
  getListing(): Promise<TicketListing | null>;
  getResponseFormData(ticketId: string): Promise<TicketResponseFormData | null>;
  saveResponse(input: SaveTicketResponseInput): Promise<TicketCommandResult>;
}
