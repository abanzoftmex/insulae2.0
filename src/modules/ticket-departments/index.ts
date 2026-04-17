import { DeleteTicketDepartmentUseCase } from "./application/delete-ticket-department.use-case";
import { GetTicketDepartmentFormUseCase } from "./application/get-ticket-department-form.use-case";
import { GetTicketDepartmentListingUseCase } from "./application/get-ticket-department-listing.use-case";
import { SaveTicketDepartmentUseCase } from "./application/save-ticket-department.use-case";
import { PrismaTicketDepartmentRepository } from "./infrastructure/prisma-ticket-department.repository";

export { toTicketDepartmentListingVM } from "./presentation/ticket-department-listing.vm";

const repository = new PrismaTicketDepartmentRepository();

export const getTicketDepartmentListingUseCase = new GetTicketDepartmentListingUseCase(repository);
export const getTicketDepartmentFormUseCase = new GetTicketDepartmentFormUseCase(repository);
export const saveTicketDepartmentUseCase = new SaveTicketDepartmentUseCase(repository);
export const deleteTicketDepartmentUseCase = new DeleteTicketDepartmentUseCase(repository);
