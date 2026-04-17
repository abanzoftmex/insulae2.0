import type {
  CreateRegulationDocumentInput,
  RegulationCommandResult,
  RegulationDirectory,
  UpdateRegulationDocumentInput,
} from "./regulation-directory";

export interface RegulationDirectoryRepository {
  getDirectory(): Promise<RegulationDirectory | null>;
  createDocument(input: CreateRegulationDocumentInput): Promise<RegulationCommandResult>;
  updateDocument(input: UpdateRegulationDocumentInput): Promise<RegulationCommandResult>;
  archiveDocument(id: string): Promise<RegulationCommandResult>;
}
