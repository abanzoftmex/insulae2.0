import type { MigrationLayer } from "@/config/migration-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";
import type { LegacySource } from "../domain/legacy-source";

const TARGET_ENTITY_BY_TABLE: Record<string, string> = {
  ROLES_CONDOMINAL: "Role",
  CAT_FORMAS_PAGO: "PaymentMethodCatalog",
  CAT_GRUPOS_COBRO: "ChargeGroup",
  CAT_GRUPO_PUESTOS: "CondominiumStructureGroup",
  CAT_PUESTOS: "CondominiumStructurePosition",
  CAT_TIPOS_CONTACTO: "ContactType",
  DCAT_ZONAS: "ZoneCatalog",
  DCAT_SUBZONAS: "SubzoneCatalog",
  DCAT_USO_SUELO: "LandUseCatalog",
  DCAT_VARIOS: "MiscIncomeCatalog",
  DIRECTORIO: "User",
  DIRECTORIO_HAS_CAT_PUESTOS: "CondominiumStructurePositionAssignment",
  AREAS_PRIVATIVAS: "PrivateArea",
  AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO: "PrivateAreaLandUse",
  AREAS_PRIVATIVAS_HAS_CUOTAS: "AreaCharge",
  DIRECTORIO_HAS_ASIGNACIONES: "UserRole",
  ARRENDAMIENTOS: "Rental",
  PAGOS: "Charge",
  HISTORICO_PAGOS: "Payment",
  HISTORICO_PAGOS_DETALLE: "PaymentDetail",
  HISTORICO_PAGOS_HAS_PAGOS: "PaymentAllocation",
  INGRESOS: "Income",
  GASTOS: "Expense",
  PRESUPUESTO: "Budget",
  PRESUPUESTO_DETALLE: "BudgetLine",
  PRESUPUESTO_MES: "BudgetMonth",
  TICKETS_DEPARTAMENTOS: "TicketDepartment",
  TICKETS: "Ticket",
  NOTIFICACIONES: "Notification",
  CONTACTOS: "ContactEntry",
  PROYECTOS: "Project",
  PROYECTOS_DOCUMENTOS: "ProjectDocument",
};

export interface ValidateLayerInput {
  runId: string;
  layer: MigrationLayer;
  source: LegacySource;
}

export class ValidateLayerUseCase {
  async execute(input: ValidateLayerInput): Promise<void> {
    for (const legacyTable of input.layer.tables) {
      const sourceCount = await input.source.countByTable(legacyTable);
      const stagingCount = await prisma.legacyStagingRow.count({
        where: { runId: input.runId, legacyTable },
      });

      let finalCount = 0;
      const targetEntity = TARGET_ENTITY_BY_TABLE[legacyTable];
      if (targetEntity) {
        finalCount = await prisma.migrationIdMap.count({
          where: {
            runId: input.runId,
            legacyTable,
            targetEntity,
          },
        });
      }

      const difference = sourceCount - stagingCount;

      await prisma.migrationValidationResult.create({
        data: {
          runId: input.runId,
          layer: input.layer.name,
          targetTable: legacyTable,
          sourceCount,
          stagingCount,
          finalCount,
          difference,
          severity: difference === 0 ? "INFO" : "ERROR",
          details: {
            targetEntity: targetEntity ?? null,
          },
        },
      });
    }
  }
}
