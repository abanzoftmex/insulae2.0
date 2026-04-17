import { prisma as basePrisma } from "@/shared/infrastructure/db/prisma";
import { toPrivateAreaStatusFromLegacy } from "@/shared/domain/private-area-status";

const LEGACY_WRITE_EXEMPT_MODELS = new Set([
  "MigrationIdMap",
  "LegacyStagingRow",
  "MigrationRun",
  "MigrationValidationResult",
]);

function stripLegacyWriteFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripLegacyWriteFields);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    if (key === "legacyId" || key.endsWith("LegacyId")) {
      continue;
    }

    sanitized[key] = stripLegacyWriteFields(entry);
  }

  return sanitized;
}

function shouldStripLegacyWrites(model: string | undefined): boolean {
  if (!model) {
    return false;
  }

  return !LEGACY_WRITE_EXEMPT_MODELS.has(model);
}

type PrismaQueryHookContext = {
  model?: string;
  args: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
};

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }: PrismaQueryHookContext) {
        if (shouldStripLegacyWrites(model) && args?.data) {
          args.data = stripLegacyWriteFields(args.data);
        }

        return query(args);
      },
      async createMany({ model, args, query }: PrismaQueryHookContext) {
        if (shouldStripLegacyWrites(model) && args?.data) {
          args.data = stripLegacyWriteFields(args.data);
        }

        return query(args);
      },
      async update({ model, args, query }: PrismaQueryHookContext) {
        if (shouldStripLegacyWrites(model) && args?.data) {
          args.data = stripLegacyWriteFields(args.data);
        }

        return query(args);
      },
      async updateMany({ model, args, query }: PrismaQueryHookContext) {
        if (shouldStripLegacyWrites(model) && args?.data) {
          args.data = stripLegacyWriteFields(args.data);
        }

        return query(args);
      },
      async upsert({ model, args, query }: PrismaQueryHookContext) {
        if (shouldStripLegacyWrites(model)) {
          if (args?.create) {
            args.create = stripLegacyWriteFields(args.create);
          }

          if (args?.update) {
            args.update = stripLegacyWriteFields(args.update);
          }
        }

        return query(args);
      },
    },
  },
}) as typeof basePrisma;

export interface PromoteFromStagingInput {
  runId: string;
  dryRun: boolean;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    return value !== "0" && value.toLowerCase() !== "false";
  }
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asInt(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function toLedgerStatus(idCatStatusPago: number | null, montoAbonado: number | null, monto: number | null):
  | "OPEN"
  | "PARTIAL"
  | "PAID"
  | "CANCELED" {
  if (idCatStatusPago === 3 || (monto !== null && montoAbonado !== null && montoAbonado >= monto)) {
    return "PAID";
  }
  if (montoAbonado !== null && montoAbonado > 0) {
    return "PARTIAL";
  }
  if (idCatStatusPago === 4) {
    return "CANCELED";
  }
  return "OPEN";
}

function toPaymentMethod(idCatFormasPago: number | null): "CASH" | "TRANSFER" | "CARD" | "CHECK" | "OTHER" {
  switch (idCatFormasPago) {
    case 1:
      return "CASH";
    case 2:
      return "TRANSFER";
    case 3:
      return "CARD";
    case 4:
      return "CHECK";
    default:
      return "OTHER";
  }
}

function toTicketStatus(idCatStatusTicket: number | null): "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" {
  switch (idCatStatusTicket) {
    case 2:
      return "CLOSED";
    case 3:
      return "IN_PROGRESS";
    case 4:
      return "RESOLVED";
    default:
      return "OPEN";
  }
}

const FALLBACK_CONTACT_TYPE_BY_LEGACY_ID: Record<number, string> = {
  1: "Direccion",
  2: "Email",
  3: "Telefono",
  4: "WhatsApp",
};

const FALLBACK_NOTIFICATION_CATEGORY_BY_LEGACY_ID: Record<number, string> = {
  1: "Experiencias",
  2: "Condominal",
  3: "Comisiones",
  4: "Seguridad",
};

const LEGACY_NOTIFICATION_BASE_URL = "https://sistemasabanza.com/insulae";

function toContactLinkTarget(value: unknown): "SAME_TAB" | "NEW_TAB" {
  return asString(value) === "_blank" ? "NEW_TAB" : "SAME_TAB";
}

function normalizeLegacyNotificationAsset(
  folder: "imagen" | "pdf",
  rawValue: unknown,
): { path: string | null; url: string | null } {
  const value = asString(rawValue)?.trim() ?? "";
  if (!value) {
    return { path: null, url: null };
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return { path: null, url: value };
  }

  const normalized = value.replace(/^\/+/, "");
  let path: string;

  if (normalized.startsWith("imagenes/notificaciones/")) {
    path = normalized;
  } else if (normalized.startsWith("notificaciones/")) {
    path = `imagenes/${normalized}`;
  } else if (normalized.startsWith(`${folder}/`)) {
    path = `imagenes/notificaciones/${normalized}`;
  } else {
    path = `imagenes/notificaciones/${folder}/${normalized}`;
  }

  return {
    path,
    url: `${LEGACY_NOTIFICATION_BASE_URL}/${path}`,
  };
}

function normalizeLegacyTicketAsset(
  folder: "imagenes" | "pdf",
  rawValue: unknown,
): { path: string | null; url: string | null } {
  const value = asString(rawValue)?.trim() ?? "";
  if (!value) {
    return { path: null, url: null };
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return { path: null, url: value };
  }

  const normalized = value.replace(/^\/+/, "");
  let path: string;

  if (normalized.startsWith("imagenes/tickets/")) {
    path = normalized;
  } else if (normalized.startsWith("tickets/")) {
    path = `imagenes/${normalized}`;
  } else if (normalized.startsWith(`${folder}/`)) {
    path = `imagenes/tickets/${normalized}`;
  } else {
    path = `imagenes/tickets/${folder}/${normalized}`;
  }

  return { path, url: null };
}

async function registerIdMap(input: {
  runId: string;
  legacyTable: string;
  legacyId: number;
  targetEntity: string;
  targetId: string;
}): Promise<void> {
  await prisma.migrationIdMap.upsert({
    where: {
      runId_legacyTable_legacyId_targetEntity: {
        runId: input.runId,
        legacyTable: input.legacyTable,
        legacyId: input.legacyId,
        targetEntity: input.targetEntity,
      },
    },
    create: input,
    update: { targetId: input.targetId },
  });
}

async function markPromoted(rowId: string): Promise<void> {
  await prisma.legacyStagingRow.update({
    where: { id: rowId },
    data: { promotedAt: new Date(), promotionError: null },
  });
}

async function markPromotionError(rowId: string, reason: string): Promise<void> {
  await prisma.legacyStagingRow.update({
    where: { id: rowId },
    data: { promotionError: reason },
  });
}

export class PromoteFromStagingUseCase {
  private async resolveMappedId(input: {
    runId: string;
    legacyTable: string;
    legacyId: number | null;
    targetEntity: string;
  }): Promise<string | null> {
    if (input.legacyId === null) {
      return null;
    }

    const map = await prisma.migrationIdMap.findUnique({
      where: {
        runId_legacyTable_legacyId_targetEntity: {
          runId: input.runId,
          legacyTable: input.legacyTable,
          legacyId: input.legacyId,
          targetEntity: input.targetEntity,
        },
      },
    });

    return map?.targetId ?? null;
  }

  private async promoteChargeGroups(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "CAT_GRUPOS_COBRO", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;

      const group = await prisma.chargeGroup.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Grupo ${row.legacyId}`,
          chargeType: asString(payload.tiempo),
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name: asString(payload.nombre) ?? `Grupo ${row.legacyId}`,
          chargeType: asString(payload.tiempo),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "CAT_GRUPOS_COBRO",
        legacyId: row.legacyId,
        targetEntity: "ChargeGroup",
        targetId: group.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteCondominiumStructureGroups(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "CAT_GRUPO_PUESTOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;

      const group = await prisma.condominiumStructureGroup.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Grupo ${row.legacyId}`,
          position: asInt(payload.posicion) ?? row.legacyId,
          structureType: asInt(payload.tipo) ?? 0,
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name: asString(payload.nombre) ?? `Grupo ${row.legacyId}`,
          position: asInt(payload.posicion) ?? row.legacyId,
          structureType: asInt(payload.tipo) ?? 0,
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "CAT_GRUPO_PUESTOS",
        legacyId: row.legacyId,
        targetEntity: "CondominiumStructureGroup",
        targetId: group.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteCondominiumStructurePositions(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "CAT_PUESTOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    const groupLegacyIds = new Set<number>();
    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const groupLegacyId = asInt(payload.id_cat_grupo_puestos);
      if (groupLegacyId !== null) {
        groupLegacyIds.add(groupLegacyId);
      }
    }

    const groupMaps = await prisma.migrationIdMap.findMany({
      where: {
        runId,
        legacyTable: "CAT_GRUPO_PUESTOS",
        targetEntity: "CondominiumStructureGroup",
        legacyId: { in: [...groupLegacyIds] },
      },
      select: { legacyId: true, targetId: true },
    });

    const groupByLegacyId = new Map<number, string>(groupMaps.map((m) => [m.legacyId, m.targetId]));

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const groupLegacyId = asInt(payload.id_cat_grupo_puestos);

      if (groupLegacyId === null) {
        await markPromotionError(row.id, "Falta id_cat_grupo_puestos en CAT_PUESTOS");
        continue;
      }

      const groupId = groupByLegacyId.get(groupLegacyId) ?? null;
      if (!groupId) {
        await markPromotionError(row.id, "Dependencia faltante (CondominiumStructureGroup)");
        continue;
      }

      const position = await prisma.condominiumStructurePosition.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          groupId,
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Puesto ${row.legacyId}`,
          quantity: Math.max(0, asInt(payload.cantidad) ?? 1),
          isAlternate: asBoolean(payload.suplente, false),
          sortOrder: row.legacyId,
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          groupId,
          name: asString(payload.nombre) ?? `Puesto ${row.legacyId}`,
          quantity: Math.max(0, asInt(payload.cantidad) ?? 1),
          isAlternate: asBoolean(payload.suplente, false),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "CAT_PUESTOS",
        legacyId: row.legacyId,
        targetEntity: "CondominiumStructurePosition",
        targetId: position.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteDirectoryPositionAssignments(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "DIRECTORIO_HAS_CAT_PUESTOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 20000,
    });

    const userLegacyIds = new Set<number>();
    const positionLegacyIds = new Set<number>();
    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const userLegacyId = asInt(payload.id_directorio);
      const positionLegacyId = asInt(payload.id_cat_puestos);
      if (userLegacyId !== null) {
        userLegacyIds.add(userLegacyId);
      }
      if (positionLegacyId !== null) {
        positionLegacyIds.add(positionLegacyId);
      }
    }

    const [userMaps, positionMaps] = await Promise.all([
      prisma.migrationIdMap.findMany({
        where: {
          runId,
          legacyTable: "DIRECTORIO",
          targetEntity: "User",
          legacyId: { in: [...userLegacyIds] },
        },
        select: { legacyId: true, targetId: true },
      }),
      prisma.migrationIdMap.findMany({
        where: {
          runId,
          legacyTable: "CAT_PUESTOS",
          targetEntity: "CondominiumStructurePosition",
          legacyId: { in: [...positionLegacyIds] },
        },
        select: { legacyId: true, targetId: true },
      }),
    ]);

    const userByLegacyId = new Map<number, string>(userMaps.map((m) => [m.legacyId, m.targetId]));
    const positionByLegacyId = new Map<number, string>(
      positionMaps.map((m) => [m.legacyId, m.targetId]),
    );

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const userLegacyId = asInt(payload.id_directorio);
      const positionLegacyId = asInt(payload.id_cat_puestos);

      if (userLegacyId === null || positionLegacyId === null) {
        await markPromotionError(row.id, "Faltan id_directorio o id_cat_puestos");
        continue;
      }

      const userId = userByLegacyId.get(userLegacyId) ?? null;
      const positionId = positionByLegacyId.get(positionLegacyId) ?? null;
      if (!userId || !positionId) {
        await markPromotionError(row.id, "Dependencias faltantes (User o CondominiumStructurePosition)");
        continue;
      }

      const isAlternate = asBoolean(payload.suplente, false);
      const assignmentModel = (
        prisma as unknown as {
          condominiumStructurePositionAssignment: {
            upsert(args: unknown): Promise<{ id: string }>;
          };
        }
      ).condominiumStructurePositionAssignment;

      const assignment = await assignmentModel.upsert({
        where: {
          positionId_userId_isAlternate: {
            positionId,
            userId,
            isAlternate,
          },
        },
        create: {
          condominiumId,
          positionId,
          userId,
          isAlternate,
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "DIRECTORIO_HAS_CAT_PUESTOS",
        legacyId: row.legacyId,
        targetEntity: "CondominiumStructurePositionAssignment",
        targetId: assignment.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteDirectorio(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "DIRECTORIO", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const email = asString(payload.email);

      const user = await prisma.user.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          firstName: asString(payload.nombre),
          lastName: asString(payload.apaterno),
          businessName: asString(payload.razon_social),
          email,
          phone: asString(payload.telefono),
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          firstName: asString(payload.nombre),
          lastName: asString(payload.apaterno),
          businessName: asString(payload.razon_social),
          email,
          phone: asString(payload.telefono),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "DIRECTORIO",
        legacyId: row.legacyId,
        targetEntity: "User",
        targetId: user.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteRoles(runId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "ROLES_CONDOMINAL", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const existing = await prisma.role.findFirst({ where: { legacyId: row.legacyId } });

      const role = existing
        ? await prisma.role.update({
            where: { id: existing.id },
            data: {
              name: asString(payload.nombre) ?? `Rol ${row.legacyId}`,
              description: asString(payload.descripcion),
              isActive: asBoolean(payload.activo, true),
            },
          })
        : await prisma.role.create({
            data: {
              legacyId: row.legacyId,
              name: asString(payload.nombre) ?? `Rol ${row.legacyId}`,
              description: asString(payload.descripcion),
              isActive: asBoolean(payload.activo, true),
            },
          });

      await registerIdMap({
        runId,
        legacyTable: "ROLES_CONDOMINAL",
        legacyId: row.legacyId,
        targetEntity: "Role",
        targetId: role.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promotePaymentMethodCatalog(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "CAT_FORMAS_PAGO", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const item = await prisma.paymentMethodCatalog.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Forma ${row.legacyId}`,
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name: asString(payload.nombre) ?? `Forma ${row.legacyId}`,
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "CAT_FORMAS_PAGO",
        legacyId: row.legacyId,
        targetEntity: "PaymentMethodCatalog",
        targetId: item.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteContactTypes(runId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "CAT_TIPOS_CONTACTO", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;

      const contactType = await prisma.contactType.upsert({
        where: { legacyId: row.legacyId },
        create: {
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Tipo ${row.legacyId}`,
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name: asString(payload.nombre) ?? `Tipo ${row.legacyId}`,
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "CAT_TIPOS_CONTACTO",
        legacyId: row.legacyId,
        targetEntity: "ContactType",
        targetId: contactType.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteZoneCatalog(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "DCAT_ZONAS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const zone = await prisma.zoneCatalog.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Zona ${row.legacyId}`,
          initials: asString(payload.iniciales),
          marketValue: asNumber(payload.valor_mkt),
          weight: asNumber(payload.ponderador),
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name: asString(payload.nombre) ?? `Zona ${row.legacyId}`,
          initials: asString(payload.iniciales),
          marketValue: asNumber(payload.valor_mkt),
          weight: asNumber(payload.ponderador),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "DCAT_ZONAS",
        legacyId: row.legacyId,
        targetEntity: "ZoneCatalog",
        targetId: zone.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteSubzoneCatalog(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "DCAT_SUBZONAS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const sourceZoneLegacyId = asInt(payload.id_dcat_zonas);
      const mappedZoneId = await this.resolveMappedId({
        runId,
        legacyTable: "DCAT_ZONAS",
        legacyId: sourceZoneLegacyId,
        targetEntity: "ZoneCatalog",
      });

      if (sourceZoneLegacyId !== null && !mappedZoneId) {
        await markPromotionError(row.id, "Dependencia faltante (ZoneCatalog)");
        continue;
      }

      const subzone = await prisma.subzoneCatalog.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Subzona ${row.legacyId}`,
          initials: asString(payload.iniciales),
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name: asString(payload.nombre) ?? `Subzona ${row.legacyId}`,
          initials: asString(payload.iniciales),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "DCAT_SUBZONAS",
        legacyId: row.legacyId,
        targetEntity: "SubzoneCatalog",
        targetId: subzone.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteLandUseCatalog(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "DCAT_USO_SUELO", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const useType = await prisma.landUseCatalog.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Uso suelo ${row.legacyId}`,
          initials: asString(payload.iniciales),
          order: asInt(payload.orden),
          weight: asNumber(payload.ponderador),
          percentage: asNumber(payload.porcentaje),
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name: asString(payload.nombre) ?? `Uso suelo ${row.legacyId}`,
          initials: asString(payload.iniciales),
          order: asInt(payload.orden),
          weight: asNumber(payload.ponderador),
          percentage: asNumber(payload.porcentaje),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "DCAT_USO_SUELO",
        legacyId: row.legacyId,
        targetEntity: "LandUseCatalog",
        targetId: useType.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteMiscIncomeCatalog(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "DCAT_VARIOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const item = await prisma.miscIncomeCatalog.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Vario ${row.legacyId}`,
          legacyChargeGroupId: asInt(payload.id_cat_grupos_cobro),
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name: asString(payload.nombre) ?? `Vario ${row.legacyId}`,
          legacyChargeGroupId: asInt(payload.id_cat_grupos_cobro),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "DCAT_VARIOS",
        legacyId: row.legacyId,
        targetEntity: "MiscIncomeCatalog",
        targetId: item.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteAreas(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "AREAS_PRIVATIVAS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const zoneId = await this.resolveMappedId({
        runId,
        legacyTable: "DCAT_ZONAS",
        legacyId: asInt(payload.id_dcat_zonas),
        targetEntity: "ZoneCatalog",
      });
      const subzoneId = await this.resolveMappedId({
        runId,
        legacyTable: "DCAT_SUBZONAS",
        legacyId: asInt(payload.id_dcat_subzonas),
        targetEntity: "SubzoneCatalog",
      });

      const [zone, subzone] = await Promise.all([
        zoneId
          ? prisma.zoneCatalog.findUnique({
              where: { id: zoneId },
              select: { name: true },
            })
          : Promise.resolve(null),
        subzoneId
          ? prisma.subzoneCatalog.findUnique({
              where: { id: subzoneId },
              select: { name: true },
            })
          : Promise.resolve(null),
      ]);

      const privateArea = await prisma.privateArea.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          sortOrder: asInt(payload.ordenamiento) ?? asInt(payload.orden) ?? 0,
          name: asString(payload.nombre) ?? `Area ${row.legacyId}`,
          code: asString(payload.iniciales),
          zone: zone?.name ?? null,
          subzone: subzone?.name ?? null,
          street: asString(payload.direccion),
          status: toPrivateAreaStatusFromLegacy(asInt(payload.id_cat_status)),
          isFusion: asBoolean(payload.es_fusion, false),
          m2Original: asNumber(payload.m2Original) ?? asNumber(payload.m2_totales),
          m2Apole: asNumber(payload.m2_construccion),
          indiviso: asNumber(payload.indiviso),
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          sortOrder: asInt(payload.ordenamiento) ?? asInt(payload.orden) ?? 0,
          name: asString(payload.nombre) ?? `Area ${row.legacyId}`,
          code: asString(payload.iniciales),
          zone: zone?.name ?? null,
          subzone: subzone?.name ?? null,
          street: asString(payload.direccion),
          status: toPrivateAreaStatusFromLegacy(asInt(payload.id_cat_status)),
          isFusion: asBoolean(payload.es_fusion, false),
          m2Original: asNumber(payload.m2Original) ?? asNumber(payload.m2_totales),
          m2Apole: asNumber(payload.m2_construccion),
          indiviso: asNumber(payload.indiviso),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "AREAS_PRIVATIVAS",
        legacyId: row.legacyId,
        targetEntity: "PrivateArea",
        targetId: privateArea.id,
      });

      await markPromoted(row.id);
    }

    // Second pass: link parent-child hierarchy once all legacy IDs were mapped.
    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const childId = await this.resolveMappedId({
        runId,
        legacyTable: "AREAS_PRIVATIVAS",
        legacyId: row.legacyId,
        targetEntity: "PrivateArea",
      });

      if (!childId) {
        continue;
      }

      const parentLegacyIdRaw = asInt(payload.id_areas_privativas_padre);
      const parentLegacyId =
        parentLegacyIdRaw !== null && parentLegacyIdRaw > 0
          ? parentLegacyIdRaw
          : asInt(payload.id_areas_privativas_hijo);

      const parentId =
        parentLegacyId !== null && parentLegacyId > 0
          ? await this.resolveMappedId({
              runId,
              legacyTable: "AREAS_PRIVATIVAS",
              legacyId: parentLegacyId,
              targetEntity: "PrivateArea",
            })
          : null;

      if (parentLegacyId !== null && parentLegacyId > 0 && !parentId) {
        continue;
      }

      await prisma.privateArea.update({
        where: { id: childId },
        data: { parentPrivateAreaId: parentId },
      });
    }
  }

  private async promoteAreaLandUseLinks(runId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const landUseLegacyId = asInt(payload.id_dcat_uso_suelo);
      const privateAreaId = await this.resolveMappedId({
        runId,
        legacyTable: "AREAS_PRIVATIVAS",
        legacyId: asInt(payload.id_areas_privativas),
        targetEntity: "PrivateArea",
      });

      if (!privateAreaId) {
        await markPromotionError(row.id, "Dependencia faltante (PrivateArea)");
        continue;
      }

      // id_dcat_uso_suelo = 0 en legacy significa "sin uso de suelo".
      if (landUseLegacyId === null || landUseLegacyId <= 0) {
        await prisma.privateArea.update({
          where: { id: privateAreaId },
          data: { useType: null },
        });

        await registerIdMap({
          runId,
          legacyTable: "AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO",
          legacyId: row.legacyId,
          targetEntity: "PrivateAreaLandUse",
          targetId: privateAreaId,
        });

        await markPromoted(row.id);
        continue;
      }

      const landUseCatalogId = await this.resolveMappedId({
        runId,
        legacyTable: "DCAT_USO_SUELO",
        legacyId: landUseLegacyId,
        targetEntity: "LandUseCatalog",
      });

      if (!landUseCatalogId) {
        await markPromotionError(row.id, "Dependencia faltante (LandUseCatalog)");
        continue;
      }

      const landUseCatalog = await prisma.landUseCatalog.findUnique({
        where: { id: landUseCatalogId },
        select: { name: true },
      });

      if (!landUseCatalog) {
        await markPromotionError(row.id, "No se encontro LandUseCatalog para el enlace de uso de suelo");
        continue;
      }

      await prisma.privateArea.update({
        where: { id: privateAreaId },
        data: { useType: landUseCatalog.name },
      });

      await registerIdMap({
        runId,
        legacyTable: "AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO",
        legacyId: row.legacyId,
        targetEntity: "PrivateAreaLandUse",
        targetId: privateAreaId,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteAreaCharges(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "AREAS_PRIVATIVAS_HAS_CUOTAS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 20000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const privateAreaId = await this.resolveMappedId({
        runId,
        legacyTable: "AREAS_PRIVATIVAS",
        legacyId: asInt(payload.id_areas_privativas),
        targetEntity: "PrivateArea",
      });
      const chargeGroupId = await this.resolveMappedId({
        runId,
        legacyTable: "CAT_GRUPOS_COBRO",
        legacyId: asInt(payload.id_cat_grupos_cobro),
        targetEntity: "ChargeGroup",
      });

      if (!privateAreaId || !chargeGroupId) {
        await markPromotionError(row.id, "Dependencias faltantes (PrivateArea o ChargeGroup)");
        continue;
      }

      const year = asInt(payload.anio);
      const startsAt = year !== null ? new Date(Date.UTC(year, 0, 1)) : null;
      const endsAt = year !== null ? new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) : null;

      const existingAreaCharge = await prisma.areaCharge.findFirst({
        where: {
          condominiumId,
          privateAreaId,
          chargeGroupId,
          startsAt,
        },
        select: { id: true },
      });

      const areaCharge = existingAreaCharge
        ? await prisma.areaCharge.update({
            where: { id: existingAreaCharge.id },
            data: {
              amount: asNumber(payload.monto) ?? 0,
              endsAt,
              isActive: asBoolean(payload.activo, true),
            },
          })
        : await prisma.areaCharge.create({
            data: {
              condominiumId,
              privateAreaId,
              chargeGroupId,
              amount: asNumber(payload.monto) ?? 0,
              startsAt,
              endsAt,
              isActive: asBoolean(payload.activo, true),
            },
          });

      await registerIdMap({
        runId,
        legacyTable: "AREAS_PRIVATIVAS_HAS_CUOTAS",
        legacyId: row.legacyId,
        targetEntity: "AreaCharge",
        targetId: areaCharge.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteCharges(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "PAGOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const privateAreaLegacyId = asInt(payload.id_areas_privativas);
      const chargeGroupLegacyId = asInt(payload.id_cat_grupos_cobro);

      const privateAreaId = await this.resolveMappedId({
        runId,
        legacyTable: "AREAS_PRIVATIVAS",
        legacyId: privateAreaLegacyId,
        targetEntity: "PrivateArea",
      });
      const chargeGroupId = await this.resolveMappedId({
        runId,
        legacyTable: "CAT_GRUPOS_COBRO",
        legacyId: chargeGroupLegacyId,
        targetEntity: "ChargeGroup",
      });

      if (!privateAreaId || !chargeGroupId) {
        await markPromotionError(row.id, "Dependencias faltantes (PrivateArea o ChargeGroup)");
        continue;
      }

      const paymentDate = asDate(payload.fechaPago) ?? new Date();
      const dueDate = asDate(payload.fechaVigencia);
      const amount = asNumber(payload.monto) ?? 0;
      const paidAmount = asNumber(payload.montoAbonado) ?? 0;
      const interestAmount = asNumber(payload.interesMoratorio) ?? 0;
      const discountAmount = asNumber(payload.descuento) ?? 0;
      const isCollectible = asBoolean(payload.activo, true);
      const tenancyId = await this.resolveMappedId({
        runId,
        legacyTable: "ARRENDAMIENTOS",
        legacyId: asInt(payload.id_arrendamientos),
        targetEntity: "Rental",
      });
      const responsibility = asInt(payload.id_opcion_estado_cuenta) === 2 ? "COMMERCE" : "OWNER";
      const status = toLedgerStatus(asInt(payload.id_cat_status_pago), paidAmount, amount);

      const charge = await prisma.charge.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          privateAreaId,
          chargeGroupId,
          tenancyId,
          responsibility,
          periodYear: paymentDate.getUTCFullYear(),
          periodMonth: paymentDate.getUTCMonth() + 1,
          amount,
          paidAmount,
          interestAmount,
          discountAmount,
          isCollectible,
          dueDate,
          status,
        },
        update: {
          privateAreaId,
          chargeGroupId,
          tenancyId,
          responsibility,
          periodYear: paymentDate.getUTCFullYear(),
          periodMonth: paymentDate.getUTCMonth() + 1,
          amount,
          paidAmount,
          interestAmount,
          discountAmount,
          isCollectible,
          dueDate,
          status,
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "PAGOS",
        legacyId: row.legacyId,
        targetEntity: "Charge",
        targetId: charge.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promotePaymentsAndAllocations(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "HISTORICO_PAGOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    const privateAreaLegacyIds = [...new Set(
      rows
        .map((row) => {
          const payload = row.payload as Record<string, unknown>;
          return asInt(payload.id_areas_privativas);
        })
        .filter((legacyId): legacyId is number => legacyId !== null),
    )];

    const privateAreaRows =
      privateAreaLegacyIds.length > 0
        ? await prisma.legacyStagingRow.findMany({
            where: {
              runId,
              legacyTable: "AREAS_PRIVATIVAS",
              legacyId: { in: privateAreaLegacyIds },
            },
            select: {
              legacyId: true,
              payload: true,
            },
          })
        : [];

    const legacyAreaActiveById = new Map<number, boolean>();
    for (const privateAreaRow of privateAreaRows) {
      const payload = privateAreaRow.payload as Record<string, unknown>;
      legacyAreaActiveById.set(privateAreaRow.legacyId, asBoolean(payload.activo, true));
    }

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const amount = asNumber(payload.monto) ?? 0;
      const paidAt = asDate(payload.fechaPago) ?? new Date();
      const method = toPaymentMethod(asInt(payload.id_cat_formas_pago));
      const legacyAreaCode = asInt(payload.id_areas_privativas);
      const legacyAreaIsActive =
        legacyAreaCode === null ? null : (legacyAreaActiveById.get(legacyAreaCode) ?? null);
      const legacyStatusCode = asInt(payload.id_cat_status_historico_pagos);
      const isLegacyActive = asBoolean(payload.activo, true);
      const privateAreaId = await this.resolveMappedId({
        runId,
        legacyTable: "AREAS_PRIVATIVAS",
        legacyId: asInt(payload.id_areas_privativas),
        targetEntity: "PrivateArea",
      });

      const payment = await prisma.payment.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          privateAreaId,
          legacyAreaCode,
          legacyAreaIsActive,
          legacyStatusCode,
          isLegacyActive,
          paidAt,
          amount,
          method,
          reference: asString(payload.folio),
          notes: asString(payload.comentarios),
        },
        update: {
          privateAreaId,
          legacyAreaCode,
          legacyAreaIsActive,
          legacyStatusCode,
          isLegacyActive,
          paidAt,
          amount,
          method,
          reference: asString(payload.folio),
          notes: asString(payload.comentarios),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "HISTORICO_PAGOS",
        legacyId: row.legacyId,
        targetEntity: "Payment",
        targetId: payment.id,
      });

      await markPromoted(row.id);
    }

    const allocationRows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "HISTORICO_PAGOS_HAS_PAGOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 20000,
    });

    for (const row of allocationRows) {
      const payload = row.payload as Record<string, unknown>;
      const paymentId = await this.resolveMappedId({
        runId,
        legacyTable: "HISTORICO_PAGOS",
        legacyId: asInt(payload.id_historico_pagos),
        targetEntity: "Payment",
      });
      const chargeId = await this.resolveMappedId({
        runId,
        legacyTable: "PAGOS",
        legacyId: asInt(payload.id_pagos),
        targetEntity: "Charge",
      });

      if (!paymentId || !chargeId) {
        await markPromotionError(row.id, "Dependencias faltantes (Payment o Charge)");
        continue;
      }

      const existingAllocation = await prisma.paymentAllocation.findFirst({
        where: { paymentId, chargeId },
        select: { id: true },
      });

      const allocation =
        existingAllocation
          ? await prisma.paymentAllocation.update({
              where: { id: existingAllocation.id },
              data: {
                amount: asNumber(payload.monto) ?? 0,
              },
            })
          : await prisma.paymentAllocation.create({
              data: {
                paymentId,
                chargeId,
                amount: asNumber(payload.monto) ?? 0,
              },
            });

      await registerIdMap({
        runId,
        legacyTable: "HISTORICO_PAGOS_HAS_PAGOS",
        legacyId: row.legacyId,
        targetEntity: "PaymentAllocation",
        targetId: allocation.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promotePaymentDetails(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "HISTORICO_PAGOS_DETALLE", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;

      const paymentId = await this.resolveMappedId({
        runId,
        legacyTable: "HISTORICO_PAGOS",
        legacyId: asInt(payload.id_historico_pagos),
        targetEntity: "Payment",
      });

      if (!paymentId) {
        await markPromotionError(row.id, "Dependencia faltante (Payment)");
        continue;
      }

      const chargeGroupId = await this.resolveMappedId({
        runId,
        legacyTable: "CAT_GRUPOS_COBRO",
        legacyId: asInt(payload.id_cat_grupos_cobro),
        targetEntity: "ChargeGroup",
      });

      const detail = await prisma.paymentDetail.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          paymentId,
          chargeGroupId,
          amount: asNumber(payload.monto) ?? 0,
          creditBalance: asNumber(payload.saldoAFavor),
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          paymentId,
          chargeGroupId,
          amount: asNumber(payload.monto) ?? 0,
          creditBalance: asNumber(payload.saldoAFavor),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "HISTORICO_PAGOS_DETALLE",
        legacyId: row.legacyId,
        targetEntity: "PaymentDetail",
        targetId: detail.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteDirectoryAssignments(runId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "DIRECTORIO_HAS_ASIGNACIONES", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    const userLegacyIds = new Set<number>();
    const roleLegacyIds = new Set<number>();
    const privateAreaLegacyIds = new Set<number>();
    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const userLegacyId = asInt(payload.id_directorio);
      const roleLegacyId = asInt(payload.id_roles_condominal);
      const privateAreaLegacyId = asInt(payload.id);
      if (userLegacyId !== null) {
        userLegacyIds.add(userLegacyId);
      }
      if (roleLegacyId !== null) {
        roleLegacyIds.add(roleLegacyId);
      }
      if (privateAreaLegacyId !== null) {
        privateAreaLegacyIds.add(privateAreaLegacyId);
      }
    }

    const [userMaps, roleMaps, privateAreaMaps] = await Promise.all([
      prisma.migrationIdMap.findMany({
        where: {
          runId,
          legacyTable: "DIRECTORIO",
          targetEntity: "User",
          legacyId: { in: [...userLegacyIds] },
        },
        select: { legacyId: true, targetId: true },
      }),
      prisma.migrationIdMap.findMany({
        where: {
          runId,
          legacyTable: "ROLES_CONDOMINAL",
          targetEntity: "Role",
          legacyId: { in: [...roleLegacyIds] },
        },
        select: { legacyId: true, targetId: true },
      }),
      prisma.migrationIdMap.findMany({
        where: {
          runId,
          legacyTable: "AREAS_PRIVATIVAS",
          targetEntity: "PrivateArea",
          legacyId: { in: [...privateAreaLegacyIds] },
        },
        select: { legacyId: true, targetId: true },
      }),
    ]);

    const userByLegacyId = new Map<number, string>(userMaps.map((m) => [m.legacyId, m.targetId]));
    const roleByLegacyId = new Map<number, string>(roleMaps.map((m) => [m.legacyId, m.targetId]));
    const privateAreaByLegacyId = new Map<number, string>(
      privateAreaMaps.map((m) => [m.legacyId, m.targetId]),
    );

    const roleIds = [...new Set(roleMaps.map((item) => item.targetId))];
    const privateAreaIds = [...new Set(privateAreaMaps.map((item) => item.targetId))];

    const [roles, privateAreas] = await Promise.all([
      roleIds.length > 0
        ? prisma.role.findMany({
            where: { id: { in: roleIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      privateAreaIds.length > 0
        ? prisma.privateArea.findMany({
            where: { id: { in: privateAreaIds } },
            select: { id: true, condominiumId: true },
          })
        : Promise.resolve([]),
    ]);

    const roleNameById = new Map(roles.map((role) => [role.id, role.name]));
    const condominiumByPrivateAreaId = new Map(
      privateAreas.map((privateArea) => [privateArea.id, privateArea.condominiumId]),
    );

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const userLegacyId = asInt(payload.id_directorio);
      const roleLegacyId = asInt(payload.id_roles_condominal);
      const privateAreaLegacyId = asInt(payload.id);
      const userId = userLegacyId === null ? null : userByLegacyId.get(userLegacyId) ?? null;
      const roleId = roleLegacyId === null ? null : roleByLegacyId.get(roleLegacyId) ?? null;
      const privateAreaId =
        privateAreaLegacyId === null ? null : privateAreaByLegacyId.get(privateAreaLegacyId) ?? null;

      if (!userId || !roleId) {
        await markPromotionError(row.id, "Dependencias faltantes (User o Role)");
        continue;
      }

      if (privateAreaLegacyId !== null && !privateAreaId) {
        await markPromotionError(row.id, "Dependencia faltante (PrivateArea)");
        continue;
      }

      const userRole = await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
        create: {
          userId,
          roleId,
        },
        update: {},
      });

      if (privateAreaId) {
        const condominiumId = condominiumByPrivateAreaId.get(privateAreaId) ?? null;
        if (!condominiumId) {
          await markPromotionError(row.id, "Dependencia faltante (Condominium por PrivateArea)");
          continue;
        }

        const roleName = roleNameById.get(roleId) ?? null;
        const startsAt = asDate(payload.created_at);
        const endsAt = asDate(payload.deleted_at);
        const isActive = asBoolean(payload.activo, true);

        const existingAssignment = await prisma.residentAssignment.findFirst({
          where: {
            condominiumId,
            userId,
            privateAreaId,
            roleName,
          },
          select: { id: true },
        });

        const residentAssignment = existingAssignment
          ? await prisma.residentAssignment.update({
              where: { id: existingAssignment.id },
              data: {
                roleName,
                startsAt,
                endsAt,
                isActive,
              },
            })
          : await prisma.residentAssignment.create({
              data: {
                condominiumId,
                userId,
                privateAreaId,
                roleName,
                startsAt,
                endsAt,
                isActive,
              },
            });

        await registerIdMap({
          runId,
          legacyTable: "DIRECTORIO_HAS_ASIGNACIONES",
          legacyId: row.legacyId,
          targetEntity: "ResidentAssignment",
          targetId: residentAssignment.id,
        });
      }

      await registerIdMap({
        runId,
        legacyTable: "DIRECTORIO_HAS_ASIGNACIONES",
        legacyId: row.legacyId,
        targetEntity: "UserRole",
        targetId: userRole.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteRentals(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "ARRENDAMIENTOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    const commerceRows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "DIRECTORIO_HAS_COMERCIOS" },
      select: {
        legacyId: true,
        payload: true,
      },
      take: 10000,
    });

    const commerceByLegacyId = new Map<
      number,
      {
        name: string | null;
        administrativeLegacyUserId: number | null;
        operativeLegacyUserId: number | null;
      }
    >();
    const contactLegacyUserIds = new Set<number>();

    for (const commerceRow of commerceRows) {
      const commercePayload = commerceRow.payload as Record<string, unknown>;
      const commerceName = asString(commercePayload.nombre);
      const administrativeLegacyUserId = asInt(commercePayload.id_directorioAdministrativo);
      const operativeLegacyUserId = asInt(commercePayload.id_directorioContable);

      if (administrativeLegacyUserId !== null) {
        contactLegacyUserIds.add(administrativeLegacyUserId);
      }

      if (operativeLegacyUserId !== null) {
        contactLegacyUserIds.add(operativeLegacyUserId);
      }

      commerceByLegacyId.set(commerceRow.legacyId, {
        name: commerceName,
        administrativeLegacyUserId,
        operativeLegacyUserId,
      });
    }

    const contactUserMaps =
      contactLegacyUserIds.size > 0
        ? await prisma.migrationIdMap.findMany({
            where: {
              runId,
              legacyTable: "DIRECTORIO",
              targetEntity: "User",
              legacyId: { in: [...contactLegacyUserIds] },
            },
            select: {
              legacyId: true,
              targetId: true,
            },
          })
        : [];

    const contactUserIdByLegacyId = new Map<number, string>();
    for (const mapping of contactUserMaps) {
      contactUserIdByLegacyId.set(mapping.legacyId, mapping.targetId);
    }

    for (const [commerceLegacyId, commerce] of commerceByLegacyId.entries()) {
      const administrativeContactUserId =
        commerce.administrativeLegacyUserId !== null
          ? contactUserIdByLegacyId.get(commerce.administrativeLegacyUserId) ?? null
          : null;
      const operativeContactUserId =
        commerce.operativeLegacyUserId !== null
          ? contactUserIdByLegacyId.get(commerce.operativeLegacyUserId) ?? null
          : null;

      // Preserve contact enrichment without persisting/maintaining a Commerce legacy write path.
      void commerceLegacyId;
      void administrativeContactUserId;
      void operativeContactUserId;
    }

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const privateAreaId = await this.resolveMappedId({
        runId,
        legacyTable: "AREAS_PRIVATIVAS",
        legacyId: asInt(payload.id_areas_privativas),
        targetEntity: "PrivateArea",
      });

      if (!privateAreaId) {
        await markPromotionError(row.id, "Dependencia faltante (PrivateArea)");
        continue;
      }

      const commerceLegacyId = asInt(payload.id_directorio_has_comercios);
      const commerce = commerceLegacyId !== null ? commerceByLegacyId.get(commerceLegacyId) ?? null : null;
      const administrativeContactUserId =
        commerce?.administrativeLegacyUserId !== null && commerce?.administrativeLegacyUserId !== undefined
          ? contactUserIdByLegacyId.get(commerce.administrativeLegacyUserId) ?? null
          : null;
      const operativeContactUserId =
        commerce?.operativeLegacyUserId !== null && commerce?.operativeLegacyUserId !== undefined
          ? contactUserIdByLegacyId.get(commerce.operativeLegacyUserId) ?? null
          : null;
      const tenantName =
        commerce?.name ??
        asString(payload.nombre_comercio) ??
        asString(payload.razon_social_comercio);
      const startsAt = asDate(payload.fecha_inicio);
      const endsAt = asDate(payload.fecha_vigencia_f861);
      const status = asString(payload.id_cat_status_comercios);
      const notes = asString(payload.observaciones);

      const existingMap = await prisma.migrationIdMap.findUnique({
        where: {
          runId_legacyTable_legacyId_targetEntity: {
            runId,
            legacyTable: "ARRENDAMIENTOS",
            legacyId: row.legacyId,
            targetEntity: "Rental",
          },
        },
      });

      const existingRental =
        existingMap
          ? await prisma.rental.findUnique({
              where: { id: existingMap.targetId },
            })
          : await prisma.rental.findFirst({
              where: {
                condominiumId,
                privateAreaId,
                tenantName,
                startsAt,
                endsAt,
              },
              select: { id: true },
            });

      const rental = existingRental
        ? await prisma.rental.update({
            where: { id: existingRental.id },
            data: {
              privateAreaId,
              tenantName,
              administrativeContactUserId,
              operativeContactUserId,
              startsAt,
              endsAt,
              status,
              notes,
            },
          })
        : await prisma.rental.create({
            data: {
              condominiumId,
              privateAreaId,
              tenantName,
              administrativeContactUserId,
              operativeContactUserId,
              startsAt,
              endsAt,
              status,
              notes,
            },
          });

      await registerIdMap({
        runId,
        legacyTable: "ARRENDAMIENTOS",
        legacyId: row.legacyId,
        targetEntity: "Rental",
        targetId: rental.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteBudgets(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "PRESUPUESTO", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const budget = await prisma.budget.upsert({
        where: {
          condominiumId_year: {
            condominiumId,
            year: asInt(payload.anio) ?? new Date().getUTCFullYear(),
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          year: asInt(payload.anio) ?? new Date().getUTCFullYear(),
          name: asString(payload.documento),
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          legacyId: row.legacyId,
          name: asString(payload.documento),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "PRESUPUESTO",
        legacyId: row.legacyId,
        targetEntity: "Budget",
        targetId: budget.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteBudgetLines(runId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "PRESUPUESTO_DETALLE", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const budgetId = await this.resolveMappedId({
        runId,
        legacyTable: "PRESUPUESTO",
        legacyId: asInt(payload.id_presupuesto),
        targetEntity: "Budget",
      });

      if (!budgetId) {
        await markPromotionError(row.id, "Dependencia faltante (Budget)");
        continue;
      }

      const concept = `Concepto ${asInt(payload.id_cat_conceptos_presupuesto) ?? row.legacyId}`;
      const groupName = `Grupo ${asInt(payload.id_cat_grupos_presupuesto) ?? "N/A"}`;

      const existingMap = await prisma.migrationIdMap.findUnique({
        where: {
          runId_legacyTable_legacyId_targetEntity: {
            runId,
            legacyTable: "PRESUPUESTO_DETALLE",
            legacyId: row.legacyId,
            targetEntity: "BudgetLine",
          },
        },
      });

      const existingBudgetLine =
        existingMap
          ? await prisma.budgetLine.findUnique({
              where: { id: existingMap.targetId },
            })
          : await prisma.budgetLine.findFirst({
              where: {
                budgetId,
                legacyId: row.legacyId,
              },
              select: { id: true },
            });

      const budgetLine = existingBudgetLine
        ? await prisma.budgetLine.update({
            where: { id: existingBudgetLine.id },
            data: {
              budgetId,
              legacyId: row.legacyId,
              concept,
              groupName,
            },
          })
        : await prisma.budgetLine.create({
            data: {
              budgetId,
              legacyId: row.legacyId,
              concept,
              groupName,
            },
          });

      await registerIdMap({
        runId,
        legacyTable: "PRESUPUESTO_DETALLE",
        legacyId: row.legacyId,
        targetEntity: "BudgetLine",
        targetId: budgetLine.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteBudgetMonths(runId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "PRESUPUESTO_MES", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 20000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const budgetLineId = await this.resolveMappedId({
        runId,
        legacyTable: "PRESUPUESTO_DETALLE",
        legacyId: asInt(payload.id_presupuesto_detalle),
        targetEntity: "BudgetLine",
      });

      if (!budgetLineId) {
        await markPromotionError(row.id, "Dependencia faltante (BudgetLine)");
        continue;
      }

      const month = asInt(payload.mes) ?? 1;
      const amount = asNumber(payload.costoMensual) ?? 0;

      const budgetMonth = await prisma.budgetMonth.upsert({
        where: {
          budgetLineId_month: {
            budgetLineId,
            month,
          },
        },
        create: {
          budgetLineId,
          month,
          amount,
        },
        update: {
          amount,
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "PRESUPUESTO_MES",
        legacyId: row.legacyId,
        targetEntity: "BudgetMonth",
        targetId: budgetMonth.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteIncomes(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "INGRESOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    const incomeUpsert = (
      prisma as unknown as {
        income: {
          upsert(args: unknown): Promise<{ id: string }>;
        };
      }
    ).income.upsert;

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;

      const income = await incomeUpsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          date: asDate(payload.fecha) ?? new Date(),
          concept: asString(payload.comentarios) ?? "Ingreso migrado",
          amount: asNumber(payload.monto) ?? 0,
          isActive: asBoolean(payload.activo, true),
          legacyChargeGroupId: asInt(payload.id_cat_grupos_cobro),
          legacyMiscCatalogId: asInt(payload.id_dcat_varios),
          legacyPrivateAreaId: asInt(payload.id_areas_privativas),
          isConfirmed: asBoolean(payload.confirmado, false),
          paymentMethod: toPaymentMethod(asInt(payload.id_cat_formas_pago)),
          notes: asString(payload.comentarios),
        },
        update: {
          date: asDate(payload.fecha) ?? new Date(),
          concept: asString(payload.comentarios) ?? "Ingreso migrado",
          amount: asNumber(payload.monto) ?? 0,
          isActive: asBoolean(payload.activo, true),
          legacyChargeGroupId: asInt(payload.id_cat_grupos_cobro),
          legacyMiscCatalogId: asInt(payload.id_dcat_varios),
          legacyPrivateAreaId: asInt(payload.id_areas_privativas),
          isConfirmed: asBoolean(payload.confirmado, false),
          paymentMethod: toPaymentMethod(asInt(payload.id_cat_formas_pago)),
          notes: asString(payload.comentarios),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "INGRESOS",
        legacyId: row.legacyId,
        targetEntity: "Income",
        targetId: income.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteExpenses(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "GASTOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    const expenseUpsert = (
      prisma as unknown as {
        expense: {
          upsert(args: unknown): Promise<{ id: string }>;
        };
      }
    ).expense.upsert;

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;

      const expense = await expenseUpsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          date: asDate(payload.fecha) ?? new Date(),
          concept: asString(payload.comentarios) ?? "Gasto migrado",
          amount: asNumber(payload.monto) ?? 0,
          isActive: asBoolean(payload.activo, true),
          legacyBudgetConceptId: asInt(payload.id_cat_conceptos_presupuesto),
          legacyReceipt: asString(payload.recibo),
          legacyProjectName: asString(payload.proyecto),
          paymentMethod: toPaymentMethod(asInt(payload.id_cat_formas_pago)),
          notes: asString(payload.comentarios),
        },
        update: {
          date: asDate(payload.fecha) ?? new Date(),
          concept: asString(payload.comentarios) ?? "Gasto migrado",
          amount: asNumber(payload.monto) ?? 0,
          isActive: asBoolean(payload.activo, true),
          legacyBudgetConceptId: asInt(payload.id_cat_conceptos_presupuesto),
          legacyReceipt: asString(payload.recibo),
          legacyProjectName: asString(payload.proyecto),
          paymentMethod: toPaymentMethod(asInt(payload.id_cat_formas_pago)),
          notes: asString(payload.comentarios),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "GASTOS",
        legacyId: row.legacyId,
        targetEntity: "Expense",
        targetId: expense.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteTicketDepartments(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "TICKETS_DEPARTAMENTOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;

      const ticketDepartmentUpsert = (
        prisma as unknown as {
          ticketDepartment: {
            upsert(args: unknown): Promise<{ id: string }>;
          };
        }
      ).ticketDepartment.upsert;

      const department = await ticketDepartmentUpsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Departamento ${row.legacyId}`,
          email: asString(payload.email) ?? "sin-correo@insulae.local",
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name: asString(payload.nombre) ?? `Departamento ${row.legacyId}`,
          email: asString(payload.email) ?? "sin-correo@insulae.local",
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "TICKETS_DEPARTAMENTOS",
        legacyId: row.legacyId,
        targetEntity: "TicketDepartment",
        targetId: department.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteTickets(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "TICKETS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const openedBy = await this.resolveMappedId({
        runId,
        legacyTable: "DIRECTORIO",
        legacyId: asInt(payload.id_directorio),
        targetEntity: "User",
      });

      const departmentId = await this.resolveMappedId({
        runId,
        legacyTable: "TICKETS_DEPARTAMENTOS",
        legacyId: asInt(payload.id_tickets_departamentos),
        targetEntity: "TicketDepartment",
      });

      const privateAreaId = await this.resolveMappedId({
        runId,
        legacyTable: "AREAS_PRIVATIVAS",
        legacyId: asInt(payload.id_areas_privativas),
        targetEntity: "PrivateArea",
      });

      const status = toTicketStatus(asInt(payload.id_cat_status_tickets));
      const responsePdf = normalizeLegacyTicketAsset("pdf", payload.pdf_respuesta);
      const responseImage = normalizeLegacyTicketAsset("imagenes", payload.imagen_respuesta);
      const respondedAt = asDate(payload.fecha_respuesta_usuario);

      const ticket = await prisma.ticket.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          departmentId,
          privateAreaId,
          openedById: openedBy,
          title: asString(payload.nombre) ?? `Ticket ${row.legacyId}`,
          description: asString(payload.descripcion),
          response: asString(payload.respuesta),
          respondedAt,
          responsePdfUrl: responsePdf.url,
          responsePdfPath: responsePdf.path,
          responseImageUrl: responseImage.url,
          responseImagePath: responseImage.path,
          status,
          openedAt: asDate(payload.fecha) ?? new Date(),
          closedAt: status === "CLOSED" ? respondedAt ?? asDate(payload.fecha) ?? new Date() : null,
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          departmentId,
          privateAreaId,
          openedById: openedBy,
          title: asString(payload.nombre) ?? `Ticket ${row.legacyId}`,
          description: asString(payload.descripcion),
          response: asString(payload.respuesta),
          respondedAt,
          responsePdfUrl: responsePdf.url,
          responsePdfPath: responsePdf.path,
          responseImageUrl: responseImage.url,
          responseImagePath: responseImage.path,
          status,
          openedAt: asDate(payload.fecha) ?? new Date(),
          closedAt: status === "CLOSED" ? respondedAt ?? asDate(payload.fecha) ?? new Date() : null,
          isActive: asBoolean(payload.activo, true),
        },
      } as unknown as Parameters<typeof prisma.ticket.upsert>[0]);

      await registerIdMap({
        runId,
        legacyTable: "TICKETS",
        legacyId: row.legacyId,
        targetEntity: "Ticket",
        targetId: ticket.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteNotificationCategories(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "DCAT_CATEGORIAS_NOTIFICACIONES", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;

      const category = await prisma.notificationCategory.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          name:
            asString(payload.nombre) ??
            FALLBACK_NOTIFICATION_CATEGORY_BY_LEGACY_ID[row.legacyId] ??
            `Categoria ${row.legacyId}`,
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name:
            asString(payload.nombre) ??
            FALLBACK_NOTIFICATION_CATEGORY_BY_LEGACY_ID[row.legacyId] ??
            `Categoria ${row.legacyId}`,
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "DCAT_CATEGORIAS_NOTIFICACIONES",
        legacyId: row.legacyId,
        targetEntity: "NotificationCategory",
        targetId: category.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteNotifications(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "NOTIFICACIONES", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const categoryLegacyId = asInt(payload.id_dcat_categorias_notificaciones);
      const typeLegacyId = asInt(payload.id_cat_tipos_notificaciones);

      let categoryId = await this.resolveMappedId({
        runId,
        legacyTable: "DCAT_CATEGORIAS_NOTIFICACIONES",
        legacyId: categoryLegacyId,
        targetEntity: "NotificationCategory",
      });

      if (!categoryId && categoryLegacyId !== null) {
        const fallbackCategory = await prisma.notificationCategory.upsert({
          where: {
            condominiumId_legacyId: {
              condominiumId,
              legacyId: categoryLegacyId,
            },
          },
          create: {
            condominiumId,
            legacyId: categoryLegacyId,
            name:
              FALLBACK_NOTIFICATION_CATEGORY_BY_LEGACY_ID[categoryLegacyId] ??
              `Categoria ${categoryLegacyId}`,
            isActive: true,
          },
          update: {
            name:
              FALLBACK_NOTIFICATION_CATEGORY_BY_LEGACY_ID[categoryLegacyId] ??
              `Categoria ${categoryLegacyId}`,
            isActive: true,
          },
        });

        await registerIdMap({
          runId,
          legacyTable: "DCAT_CATEGORIAS_NOTIFICACIONES",
          legacyId: categoryLegacyId,
          targetEntity: "NotificationCategory",
          targetId: fallbackCategory.id,
        });

        categoryId = fallbackCategory.id;
      }

      const legacyImage = normalizeLegacyNotificationAsset("imagen", payload.imagen);
      const legacyPdf = normalizeLegacyNotificationAsset("pdf", payload.pdf);
      const createData: Record<string, unknown> = {
        condominiumId,
        legacyId: row.legacyId,
        title: asString(payload.nombre) ?? `Notificacion ${row.legacyId}`,
        message: asString(payload.descripcion) ?? "Sin descripcion",
        category: typeLegacyId !== null ? `${typeLegacyId}` : asString(payload.id_cat_tipos_notificaciones),
        categoryId,
        sentAt: asDate(payload.fechaPublicar),
        validUntil: asDate(payload.fechaVigencia),
        imageUrl: legacyImage.url,
        imagePath: legacyImage.path,
        pdfUrl: legacyPdf.url,
        pdfPath: legacyPdf.path,
      };
      const updateData: Record<string, unknown> = {
        title: asString(payload.nombre) ?? `Notificacion ${row.legacyId}`,
        message: asString(payload.descripcion) ?? "Sin descripcion",
        category: typeLegacyId !== null ? `${typeLegacyId}` : asString(payload.id_cat_tipos_notificaciones),
        categoryId,
        sentAt: asDate(payload.fechaPublicar),
        validUntil: asDate(payload.fechaVigencia),
        imageUrl: legacyImage.url,
        imagePath: legacyImage.path,
        pdfUrl: legacyPdf.url,
        pdfPath: legacyPdf.path,
      };

      const notificationModel = (
        prisma as unknown as {
          notification: {
            upsert(args: unknown): Promise<{ id: string }>;
          };
        }
      ).notification;

      const notification = await notificationModel.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: createData,
        update: updateData,
      });

      await registerIdMap({
        runId,
        legacyTable: "NOTIFICACIONES",
        legacyId: row.legacyId,
        targetEntity: "Notification",
        targetId: notification.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteContacts(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "CONTACTOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const contactTypeLegacyId = asInt(payload.id_cat_tipos_contacto);

      let contactTypeId = await this.resolveMappedId({
        runId,
        legacyTable: "CAT_TIPOS_CONTACTO",
        legacyId: contactTypeLegacyId,
        targetEntity: "ContactType",
      });

      if (!contactTypeId && contactTypeLegacyId !== null) {
        const fallbackName =
          FALLBACK_CONTACT_TYPE_BY_LEGACY_ID[contactTypeLegacyId] ?? `Tipo ${contactTypeLegacyId}`;

        const contactType = await prisma.contactType.upsert({
          where: { legacyId: contactTypeLegacyId },
          create: {
            legacyId: contactTypeLegacyId,
            name: fallbackName,
            isActive: true,
          },
          update: {
            name: fallbackName,
            isActive: true,
          },
        });

        await registerIdMap({
          runId,
          legacyTable: "CAT_TIPOS_CONTACTO",
          legacyId: contactTypeLegacyId,
          targetEntity: "ContactType",
          targetId: contactType.id,
        });

        contactTypeId = contactType.id;
      }

      if (!contactTypeId) {
        await markPromotionError(row.id, "Dependencia faltante (ContactType)");
        continue;
      }

      const contact = await prisma.contactEntry.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          contactTypeId,
          name: asString(payload.nombre) ?? `Contacto ${row.legacyId}`,
          value: asString(payload.dato) ?? "",
          linkUrl: asString(payload.enlace) ?? asString(payload.dato) ?? "",
          linkTarget: toContactLinkTarget(payload.target),
          sortOrder: asInt(payload.orden) ?? 0,
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          contactTypeId,
          name: asString(payload.nombre) ?? `Contacto ${row.legacyId}`,
          value: asString(payload.dato) ?? "",
          linkUrl: asString(payload.enlace) ?? asString(payload.dato) ?? "",
          linkTarget: toContactLinkTarget(payload.target),
          sortOrder: asInt(payload.orden) ?? 0,
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "CONTACTOS",
        legacyId: row.legacyId,
        targetEntity: "ContactEntry",
        targetId: contact.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteProjects(runId: string, condominiumId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "PROYECTOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 5000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;

      const project = await prisma.project.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId,
            legacyId: row.legacyId,
          },
        },
        create: {
          condominiumId,
          legacyId: row.legacyId,
          name: asString(payload.nombre) ?? `Proyecto ${row.legacyId}`,
          initials: asString(payload.iniciales),
          description: asString(payload.sintesisAviso),
          privacyNoticeText: asString(payload.aviso_privacidad),
          startYear: asInt(payload.anioArranque),
          condominiumFormatId: asInt(payload.id_cat_formas_proyectos),
          totalM2: asNumber(payload.totalM2),
          totalApoles: asInt(payload.totalApoles),
          commonAreasM2: asNumber(payload.areasComunes),
          condominiumLogoUrl: asString(payload.logo),
          condominiumImageUrl: asString(payload.imagen_sad),
          footerLogoUrl: asString(payload.imagen_pie),
          privacyNoticePdfUrl: asString(payload.pdfAviso),
          footerLeft: asString(payload.pie_izquierda),
          footerRight: asString(payload.pie_derecha),
          developedBy: asString(payload.pie_desarrollado),
          usesLandUseFormula: asBoolean(payload.formulasUsodeSuelo, false),
          hasVccc: asBoolean(payload.manejovccc, false),
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          name: asString(payload.nombre) ?? `Proyecto ${row.legacyId}`,
          initials: asString(payload.iniciales),
          description: asString(payload.sintesisAviso),
          privacyNoticeText: asString(payload.aviso_privacidad),
          startYear: asInt(payload.anioArranque),
          condominiumFormatId: asInt(payload.id_cat_formas_proyectos),
          totalM2: asNumber(payload.totalM2),
          totalApoles: asInt(payload.totalApoles),
          commonAreasM2: asNumber(payload.areasComunes),
          condominiumLogoUrl: asString(payload.logo),
          condominiumImageUrl: asString(payload.imagen_sad),
          footerLogoUrl: asString(payload.imagen_pie),
          privacyNoticePdfUrl: asString(payload.pdfAviso),
          footerLeft: asString(payload.pie_izquierda),
          footerRight: asString(payload.pie_derecha),
          developedBy: asString(payload.pie_desarrollado),
          usesLandUseFormula: asBoolean(payload.formulasUsodeSuelo, false),
          hasVccc: asBoolean(payload.manejovccc, false),
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "PROYECTOS",
        legacyId: row.legacyId,
        targetEntity: "Project",
        targetId: project.id,
      });

      await markPromoted(row.id);
    }
  }

  private async promoteProjectDocuments(runId: string): Promise<void> {
    const rows = await prisma.legacyStagingRow.findMany({
      where: { runId, legacyTable: "PROYECTOS_DOCUMENTOS", promotedAt: null },
      orderBy: { legacyId: "asc" },
      take: 10000,
    });

    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const projectId = await this.resolveMappedId({
        runId,
        legacyTable: "PROYECTOS",
        legacyId: asInt(payload.id_proyectos),
        targetEntity: "Project",
      });

      if (!projectId) {
        await markPromotionError(row.id, "Dependencia faltante (Project)");
        continue;
      }

      const documentType =
        asInt(payload.id_cat_tipos_documento) === 2 ? "INTERNAL_DOCUMENT" : "REGULATION";

      const doc = await prisma.projectDocument.upsert({
        where: {
          projectId_legacyId: {
            projectId,
            legacyId: row.legacyId,
          },
        },
        create: {
          projectId,
          legacyId: row.legacyId,
          fileName: asString(payload.nombre) ?? `documento-${row.legacyId}`,
          documentType,
          mimeType: null,
          storageBucket: "legacy-import",
          storagePath: asString(payload.archivo) ?? `legacy/${row.legacyId}`,
          isActive: asBoolean(payload.activo, true),
        },
        update: {
          fileName: asString(payload.nombre) ?? `documento-${row.legacyId}`,
          documentType,
          storagePath: asString(payload.archivo) ?? `legacy/${row.legacyId}`,
          isActive: asBoolean(payload.activo, true),
        },
      });

      await registerIdMap({
        runId,
        legacyTable: "PROYECTOS_DOCUMENTOS",
        legacyId: row.legacyId,
        targetEntity: "ProjectDocument",
        targetId: doc.id,
      });

      await markPromoted(row.id);
    }
  }

  async execute(input: PromoteFromStagingInput): Promise<void> {
    const condominium = await prisma.condominium.upsert({
      where: { slug: "valquirico" },
      update: {},
      create: {
        name: "Val'Quirico",
        slug: "valquirico",
        isActive: true,
      },
    });

    if (input.dryRun) {
      return;
    }

    await this.promoteRoles(input.runId);
    await this.promotePaymentMethodCatalog(input.runId, condominium.id);
    await this.promoteContactTypes(input.runId);
    await this.promoteZoneCatalog(input.runId, condominium.id);
    await this.promoteSubzoneCatalog(input.runId, condominium.id);
    await this.promoteLandUseCatalog(input.runId, condominium.id);
    await this.promoteMiscIncomeCatalog(input.runId, condominium.id);
    await this.promoteChargeGroups(input.runId, condominium.id);
    await this.promoteCondominiumStructureGroups(input.runId, condominium.id);
    await this.promoteCondominiumStructurePositions(input.runId, condominium.id);
    await this.promoteDirectorio(input.runId, condominium.id);
    await this.promoteAreas(input.runId, condominium.id);
    await this.promoteAreaLandUseLinks(input.runId);
    await this.promoteAreaCharges(input.runId, condominium.id);
    await this.promoteDirectoryAssignments(input.runId);
    await this.promoteDirectoryPositionAssignments(input.runId, condominium.id);
    await this.promoteRentals(input.runId, condominium.id);
    await this.promoteCharges(input.runId, condominium.id);
    await this.promotePaymentsAndAllocations(input.runId, condominium.id);
    await this.promotePaymentDetails(input.runId, condominium.id);
    await this.promoteIncomes(input.runId, condominium.id);
    await this.promoteExpenses(input.runId, condominium.id);
    await this.promoteBudgets(input.runId, condominium.id);
    await this.promoteBudgetLines(input.runId);
    await this.promoteBudgetMonths(input.runId);
    await this.promoteNotificationCategories(input.runId, condominium.id);
    await this.promoteTicketDepartments(input.runId, condominium.id);
    await this.promoteTickets(input.runId, condominium.id);
    await this.promoteNotifications(input.runId, condominium.id);
    await this.promoteContacts(input.runId, condominium.id);
    await this.promoteProjects(input.runId, condominium.id);
    await this.promoteProjectDocuments(input.runId);
  }
}
