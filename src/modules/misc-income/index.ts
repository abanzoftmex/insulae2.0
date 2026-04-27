import { PrismaMiscIncomeCatalogRepository } from "./infrastructure/prisma-misc-income-catalog.repository";
import { 
  GetMiscIncomeCatalogUseCase, 
  SaveMiscIncomeCatalogUseCase, 
  DeleteMiscIncomeConceptUseCase 
} from "./application/misc-income-catalog.use-cases";

const repository = new PrismaMiscIncomeCatalogRepository();

export const getMiscIncomeCatalogUseCase = new GetMiscIncomeCatalogUseCase(repository);
export const saveMiscIncomeCatalogUseCase = new SaveMiscIncomeCatalogUseCase(repository);
export const deleteMiscIncomeConceptUseCase = new DeleteMiscIncomeConceptUseCase(repository);

export * from "./domain/misc-income-catalog.repository";
