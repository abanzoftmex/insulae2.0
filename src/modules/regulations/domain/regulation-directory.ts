export type RegulationDocumentType = "REGULATION" | "INTERNAL_DOCUMENT";

export interface RegulationDocument {
  id: string;
  projectId: string;
  name: string;
  documentType: RegulationDocumentType;
  publicUrl: string;
  uploadedAt: Date;
}

export interface RegulationDirectory {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  projectId: string;
  projectName: string;
  documents: RegulationDocument[];
}

export interface CreateRegulationDocumentInput {
  name: string;
  documentType: RegulationDocumentType;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storageBucket: string;
  storageObjectPath: string | null;
}

export interface UpdateRegulationDocumentInput {
  id: string;
  name: string;
  documentType: RegulationDocumentType;
  fileUrl?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storageBucket?: string;
  storageObjectPath?: string | null;
}

export interface RegulationCommandResult {
  ok: boolean;
  message: string;
}
