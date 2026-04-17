import { GetTicketListingUseCase } from "./application/get-ticket-listing.use-case";
import { GetTicketResponseFormUseCase } from "./application/get-ticket-response-form.use-case";
import { SaveTicketResponseUseCase } from "./application/save-ticket-response.use-case";
import { PrismaTicketRepository } from "./infrastructure/prisma-ticket.repository";

export { toTicketListingVM, toTicketResponseFormVM } from "./presentation/ticket-listing.vm";

const repository = new PrismaTicketRepository();

export const getTicketListingUseCase = new GetTicketListingUseCase(repository);
export const getTicketResponseFormUseCase = new GetTicketResponseFormUseCase(repository);
export const saveTicketResponseUseCase = new SaveTicketResponseUseCase(repository);
