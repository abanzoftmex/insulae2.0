"use server";

import { revalidatePath } from "next/cache";

import {
  archiveRegulationDocumentUseCase,
  createRegulationDocumentUseCase,
  updateRegulationDocumentUseCase,
} from "@/modules/regulations";
import type { RegulationDocumentType } from "@/modules/regulations/domain/regulation-directory";

function trimSafe(value: string): string {
  return value.trim();
}

export interface RegulationDocumentActionInput {
  id?: string;
  name: string;
  documentType: RegulationDocumentType;
  fileUrl?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storageBucket?: string;
  storageObjectPath?: string | null;
}

export async function createRegulationDocumentAction(
  input: RegulationDocumentActionInput,
): Promise<{ ok: boolean; message: string }> {
  const name = trimSafe(input.name);
  const fileUrl = trimSafe(input.fileUrl ?? "");

  if (!name || !fileUrl) {
    return {
      ok: false,
      message: "Nombre y archivo PDF son obligatorios.",
    };
  }

  const response = await createRegulationDocumentUseCase.execute({
    name,
    documentType: input.documentType,
    fileUrl,
    mimeType: input.mimeType ?? "application/pdf",
    sizeBytes: input.sizeBytes ?? null,
    storageBucket: trimSafe(input.storageBucket ?? "") || "firebase",
    storageObjectPath: input.storageObjectPath ?? null,
  });

  if (response.ok) {
    revalidatePath("/reglamentos");
    revalidatePath("/condominio");
  }

  return response;
}

export async function updateRegulationDocumentAction(
  input: RegulationDocumentActionInput,
): Promise<{ ok: boolean; message: string }> {
  const id = trimSafe(input.id ?? "");
  const name = trimSafe(input.name);

  if (!id || !name) {
    return {
      ok: false,
      message: "No se recibio la informacion requerida para actualizar.",
    };
  }

  const fileUrl = input.fileUrl ? trimSafe(input.fileUrl) : undefined;

  const response = await updateRegulationDocumentUseCase.execute({
    id,
    name,
    documentType: input.documentType,
    fileUrl,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storageBucket: input.storageBucket,
    storageObjectPath: input.storageObjectPath,
  });

  if (response.ok) {
    revalidatePath("/reglamentos");
    revalidatePath("/condominio");
  }

  return response;
}

export async function archiveRegulationDocumentAction(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  const documentId = trimSafe(id);
  if (!documentId) {
    return {
      ok: false,
      message: "No se recibio identificador de documento.",
    };
  }

  const response = await archiveRegulationDocumentUseCase.execute(documentId);

  if (response.ok) {
    revalidatePath("/reglamentos");
    revalidatePath("/condominio");
  }

  return response;
}
