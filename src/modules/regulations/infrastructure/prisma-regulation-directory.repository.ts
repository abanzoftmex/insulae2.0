import { randomUUID } from "node:crypto";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  CreateRegulationDocumentInput,
  RegulationCommandResult,
  RegulationDirectory,
  RegulationDocumentType,
  UpdateRegulationDocumentInput,
} from "../domain/regulation-directory";
import type { RegulationDirectoryRepository } from "../domain/regulation-directory.repository";

function trimSafe(value: string): string {
  return value.trim();
}

interface ProjectDocumentCapabilities {
  hasDocumentType: boolean;
  hasIsActive: boolean;
}

async function getProjectDocumentCapabilities(): Promise<ProjectDocumentCapabilities> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT lower(column_name) AS column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND lower(table_name) = lower('ProjectDocument')
      AND lower(column_name) IN ('documenttype', 'isactive')
  `;

  const set = new Set(rows.map((row) => row.column_name));

  return {
    hasDocumentType: set.has("documenttype"),
    hasIsActive: set.has("isactive"),
  };
}

function resolvePublicUrl(storageBucket: string, storagePath: string): string {
  const normalizedPath = storagePath.trim();
  if (!normalizedPath) {
    return "";
  }

  if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
    return normalizedPath;
  }

  if (storageBucket === "legacy-import") {
    return `/imagenes/documentos/${normalizedPath.replace(/^\/+/, "")}`;
  }

  return normalizedPath;
}

async function resolveCondominiumAndProject(): Promise<
  | {
      condominiumId: string;
      condominiumSlug: string;
      condominiumName: string;
      projectId: string;
      projectName: string;
    }
  | null
> {
  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      orderBy: { slug: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    }));

  if (!condominium) {
    return null;
  }

  const project = await prisma.project.findFirst({
    where: {
      condominiumId: condominium.id,
      isActive: true,
    },
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
    },
  });

  if (!project) {
    return null;
  }

  return {
    condominiumId: condominium.id,
    condominiumSlug: condominium.slug,
    condominiumName: condominium.name,
    projectId: project.id,
    projectName: project.name,
  };
}

function toDocumentType(value: RegulationDocumentType): "REGULATION" | "INTERNAL_DOCUMENT" {
  return value;
}

export class PrismaRegulationDirectoryRepository implements RegulationDirectoryRepository {
  async getDirectory(): Promise<RegulationDirectory | null> {
    const scope = await resolveCondominiumAndProject();
    if (!scope) {
      return null;
    }

    const capabilities = await getProjectDocumentCapabilities();

    const documents = capabilities.hasDocumentType && capabilities.hasIsActive
      ? await prisma.$queryRaw<
          Array<{
            id: string;
            projectId: string;
            fileName: string;
            documentType: string;
            storageBucket: string;
            storagePath: string;
            uploadedAt: Date;
          }>
        >`
          SELECT
            "id",
            "projectId",
            "fileName",
            "documentType"::text AS "documentType",
            "storageBucket",
            "storagePath",
            "uploadedAt"
          FROM "ProjectDocument"
          WHERE "projectId" = ${scope.projectId}
            AND "isActive" = true
          ORDER BY "documentType" ASC, "uploadedAt" DESC, "fileName" ASC
        `
      : await prisma.$queryRaw<
          Array<{
            id: string;
            projectId: string;
            fileName: string;
            documentType: string;
            storageBucket: string;
            storagePath: string;
            uploadedAt: Date;
          }>
        >`
          SELECT
            "id",
            "projectId",
            "fileName",
            'REGULATION'::text AS "documentType",
            "storageBucket",
            "storagePath",
            "uploadedAt"
          FROM "ProjectDocument"
          WHERE "projectId" = ${scope.projectId}
          ORDER BY "uploadedAt" DESC, "fileName" ASC
        `;

    return {
      condominiumId: scope.condominiumId,
      condominiumSlug: scope.condominiumSlug,
      condominiumName: scope.condominiumName,
      projectId: scope.projectId,
      projectName: scope.projectName,
      documents: documents.map((document) => ({
        id: document.id,
        projectId: document.projectId,
        name: document.fileName,
        documentType: document.documentType === "INTERNAL_DOCUMENT" ? "INTERNAL_DOCUMENT" : "REGULATION",
        publicUrl: resolvePublicUrl(document.storageBucket, document.storagePath),
        uploadedAt: new Date(document.uploadedAt),
      })),
    };
  }

  async createDocument(input: CreateRegulationDocumentInput): Promise<RegulationCommandResult> {
    const scope = await resolveCondominiumAndProject();
    if (!scope) {
      return {
        ok: false,
        message: "No se encontro condominio/proyecto activo para guardar el documento.",
      };
    }

    const name = trimSafe(input.name);
    const fileUrl = trimSafe(input.fileUrl);

    if (!name || !fileUrl) {
      return {
        ok: false,
        message: "Nombre y archivo PDF son obligatorios.",
      };
    }

    const capabilities = await getProjectDocumentCapabilities();
    const storageBucket = trimSafe(input.storageBucket) || "firebase";

    if (capabilities.hasDocumentType && capabilities.hasIsActive) {
      await prisma.$executeRaw`
        INSERT INTO "ProjectDocument" (
          "id",
          "projectId",
          "fileName",
          "documentType",
          "mimeType",
          "sizeBytes",
          "storageBucket",
          "storagePath",
          "checksum",
          "isActive",
          "uploadedAt"
        ) VALUES (
          ${randomUUID()},
          ${scope.projectId},
          ${name},
          ${toDocumentType(input.documentType)}::"ProjectDocumentType",
          ${input.mimeType},
          ${input.sizeBytes},
          ${storageBucket},
          ${fileUrl},
          ${input.storageObjectPath},
          true,
          now()
        )
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "ProjectDocument" (
          "id",
          "projectId",
          "fileName",
          "mimeType",
          "sizeBytes",
          "storageBucket",
          "storagePath",
          "checksum",
          "uploadedAt"
        ) VALUES (
          ${randomUUID()},
          ${scope.projectId},
          ${name},
          ${input.mimeType},
          ${input.sizeBytes},
          ${storageBucket},
          ${fileUrl},
          ${input.storageObjectPath},
          now()
        )
      `;
    }

    return {
      ok: true,
      message: "Documento guardado correctamente.",
    };
  }

  async updateDocument(input: UpdateRegulationDocumentInput): Promise<RegulationCommandResult> {
    const scope = await resolveCondominiumAndProject();
    if (!scope) {
      return {
        ok: false,
        message: "No se encontro condominio/proyecto activo para actualizar.",
      };
    }

    const id = trimSafe(input.id);
    const name = trimSafe(input.name);

    if (!id || !name) {
      return {
        ok: false,
        message: "No se recibio la informacion requerida para actualizar.",
      };
    }

    const capabilities = await getProjectDocumentCapabilities();
    const existing = capabilities.hasIsActive
      ? await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT d."id"
          FROM "ProjectDocument" d
          INNER JOIN "Project" p ON p."id" = d."projectId"
          WHERE d."id" = ${id}
            AND p."condominiumId" = ${scope.condominiumId}
            AND d."isActive" = true
          LIMIT 1
        `
      : await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT d."id"
          FROM "ProjectDocument" d
          INNER JOIN "Project" p ON p."id" = d."projectId"
          WHERE d."id" = ${id}
            AND p."condominiumId" = ${scope.condominiumId}
          LIMIT 1
        `;

    if (existing.length === 0) {
      return {
        ok: false,
        message: "El documento no existe o ya no esta activo.",
      };
    }

    const fileUrl = input.fileUrl ? trimSafe(input.fileUrl) : undefined;

    const existingId = existing[0]?.id;
    if (!existingId) {
      return {
        ok: false,
        message: "El documento no existe o ya no esta activo.",
      };
    }

    if (capabilities.hasDocumentType) {
      await prisma.$executeRaw`
        UPDATE "ProjectDocument"
        SET
          "fileName" = ${name},
          "documentType" = ${toDocumentType(input.documentType)}::"ProjectDocumentType"
        WHERE "id" = ${existingId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "ProjectDocument"
        SET "fileName" = ${name}
        WHERE "id" = ${existingId}
      `;
    }

    if (fileUrl) {
      await prisma.$executeRaw`
        UPDATE "ProjectDocument"
        SET
          "storagePath" = ${fileUrl},
          "storageBucket" = ${trimSafe(input.storageBucket ?? "") || "firebase"},
          "mimeType" = ${input.mimeType ?? "application/pdf"},
          "sizeBytes" = ${input.sizeBytes ?? null},
          "checksum" = ${input.storageObjectPath ?? null}
        WHERE "id" = ${existingId}
      `;
    }

    return {
      ok: true,
      message: "Documento actualizado correctamente.",
    };
  }

  async archiveDocument(id: string): Promise<RegulationCommandResult> {
    const scope = await resolveCondominiumAndProject();
    if (!scope) {
      return {
        ok: false,
        message: "No se encontro condominio/proyecto activo para eliminar.",
      };
    }

    const documentId = trimSafe(id);
    if (!documentId) {
      return {
        ok: false,
        message: "No se recibio identificador de documento.",
      };
    }

    const capabilities = await getProjectDocumentCapabilities();
    const existing = capabilities.hasIsActive
      ? await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT d."id"
          FROM "ProjectDocument" d
          INNER JOIN "Project" p ON p."id" = d."projectId"
          WHERE d."id" = ${documentId}
            AND p."condominiumId" = ${scope.condominiumId}
            AND d."isActive" = true
          LIMIT 1
        `
      : await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT d."id"
          FROM "ProjectDocument" d
          INNER JOIN "Project" p ON p."id" = d."projectId"
          WHERE d."id" = ${documentId}
            AND p."condominiumId" = ${scope.condominiumId}
          LIMIT 1
        `;

    if (existing.length === 0) {
      return {
        ok: false,
        message: "El documento no existe o ya fue eliminado.",
      };
    }

    const existingId = existing[0]?.id;
    if (!existingId) {
      return {
        ok: false,
        message: "El documento no existe o ya fue eliminado.",
      };
    }

    if (capabilities.hasIsActive) {
      await prisma.$executeRaw`
        UPDATE "ProjectDocument"
        SET "isActive" = false
        WHERE "id" = ${existingId}
      `;
    } else {
      await prisma.$executeRaw`
        DELETE FROM "ProjectDocument"
        WHERE "id" = ${existingId}
      `;
    }

    return {
      ok: true,
      message: "Documento eliminado correctamente.",
    };
  }
}
