import type {
  RegulationDirectory,
  RegulationDocument,
  RegulationDocumentType,
} from "../domain/regulation-directory";

export interface RegulationDocumentVM {
  id: string;
  name: string;
  documentType: RegulationDocumentType;
  documentTypeLabel: string;
  publicUrl: string;
  uploadedAtLabel: string;
}

export interface RegulationDirectoryVM {
  condominiumName: string;
  condominiumSlug: string;
  projectId: string;
  projectName: string;
  totalDocuments: string;
  totalRegulations: string;
  totalInternalDocuments: string;
  documents: RegulationDocumentVM[];
}

function documentTypeLabel(documentType: RegulationDocumentType): string {
  return documentType === "INTERNAL_DOCUMENT" ? "Documento interno" : "Reglamento";
}

function formatUploadedAt(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function mapDocument(document: RegulationDocument): RegulationDocumentVM {
  return {
    id: document.id,
    name: document.name,
    documentType: document.documentType,
    documentTypeLabel: documentTypeLabel(document.documentType),
    publicUrl: document.publicUrl,
    uploadedAtLabel: formatUploadedAt(document.uploadedAt),
  };
}

export function toRegulationDirectoryVM(directory: RegulationDirectory): RegulationDirectoryVM {
  const totalRegulations = directory.documents.filter(
    (document) => document.documentType === "REGULATION",
  ).length;
  const totalInternalDocuments = directory.documents.filter(
    (document) => document.documentType === "INTERNAL_DOCUMENT",
  ).length;

  return {
    condominiumName: directory.condominiumName,
    condominiumSlug: directory.condominiumSlug,
    projectId: directory.projectId,
    projectName: directory.projectName,
    totalDocuments: directory.documents.length.toLocaleString("es-MX"),
    totalRegulations: totalRegulations.toLocaleString("es-MX"),
    totalInternalDocuments: totalInternalDocuments.toLocaleString("es-MX"),
    documents: directory.documents.map(mapDocument),
  };
}
