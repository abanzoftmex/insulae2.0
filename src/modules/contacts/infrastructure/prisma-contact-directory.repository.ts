import { randomUUID } from "node:crypto";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type { ContactDirectory } from "../domain/contact-directory";
import type { ContactDirectoryRepository } from "../domain/contact-directory.repository";

const DEFAULT_CONTACT_TYPES = [
  "Email",
  "Telefono",
  "WhatsApp",
  "Sitio web",
  "Red social",
] as const;

async function ensureDefaultContactTypes(): Promise<void> {
  const activeTypeRows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT "name"
    FROM "ContactType"
    WHERE "isActive" = true
  `;

  const existingNames = new Set(activeTypeRows.map((row) => row.name.trim().toLowerCase()));

  for (const typeName of DEFAULT_CONTACT_TYPES) {
    if (existingNames.has(typeName.toLowerCase())) {
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO "ContactType" (
        "id",
        "name",
        "isActive",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${typeName},
        true,
        now(),
        now()
      )
    `;
  }
}

export class PrismaContactDirectoryRepository implements ContactDirectoryRepository {
  async getDirectory(): Promise<ContactDirectory | null> {
    await ensureDefaultContactTypes();

    const condominium =
      (await prisma.condominium.findFirst({
        where: {
          isActive: true,
          slug: PROJECT_SCOPE.condominiumCode,
        },
        select: {
          id: true,
          slug: true,
          name: true,
        },
      })) ??
      (await prisma.condominium.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
        },
      }));

    if (!condominium) {
      return null;
    }

    const [types, entries] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT "id", "name"
        FROM "ContactType"
        WHERE "isActive" = true
        ORDER BY "name" ASC
      `,
      prisma.$queryRaw<
        Array<{
          id: string;
          contactTypeId: string;
          typeName: string;
          name: string;
          value: string;
          linkUrl: string;
          linkTarget: "SAME_TAB" | "NEW_TAB";
          sortOrder: number;
        }>
      >`
        SELECT
          entry."id",
          entry."contactTypeId",
          type."name" AS "typeName",
          entry."name",
          entry."value",
          entry."linkUrl",
          entry."linkTarget"::text AS "linkTarget",
          entry."sortOrder"
        FROM "ContactEntry" entry
        INNER JOIN "ContactType" type ON type."id" = entry."contactTypeId"
        WHERE entry."condominiumId" = ${condominium.id}
          AND entry."isActive" = true
        ORDER BY entry."sortOrder" ASC, entry."updatedAt" DESC
      `,
    ]);

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      types: types.map((type) => ({
        id: type.id,
        name: type.name,
      })),
      entries: entries.map((entry) => ({
        id: entry.id,
        typeId: entry.contactTypeId,
        typeName: entry.typeName,
        name: entry.name,
        value: entry.value,
        linkUrl: entry.linkUrl,
        linkTarget: entry.linkTarget,
        sortOrder: entry.sortOrder,
      })),
    };
  }
}
