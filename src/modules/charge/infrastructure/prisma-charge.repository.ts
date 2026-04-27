import { PrismaClient } from "@prisma/client";
import {
  IChargeRepository,
  PreviewMassChargeRequest,
  PreviewMassChargeResult,
  CreateMassChargeRequest,
  CreateMassChargeResult,
  PreviewPropertyResult,
} from "../domain/mass-charge.types";

export class PrismaChargeRepository implements IChargeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async previewMassCharges(req: PreviewMassChargeRequest): Promise<PreviewMassChargeResult> {
    const chargeGroup = await this.prisma.chargeGroup.findUnique({
      where: { id: req.chargeGroupId },
    });
    if (!chargeGroup) throw new Error("Charge Group not found");

    // Fetch all active private areas in the given zone
    const privateAreas = await this.prisma.privateArea.findMany({
      where: {
        condominiumId: req.condominiumId,
        isActive: true,
        zone: req.zone,
        useType: { not: null },
        status: "AVAILABLE",
      },
      include: {
        rentals: {
          where: {
            OR: [{ status: { not: "4" } }, { status: null }],
          },
          select: { id: true, tenantName: true, commerce: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    // Also fetch the AreaCharge predefined amounts for this chargeGroup
    const areaCharges = await this.prisma.areaCharge.findMany({
      where: {
        condominiumId: req.condominiumId,
        chargeGroupId: req.chargeGroupId,
        isActive: true,
        privateAreaId: { in: privateAreas.map((pa) => pa.id) },
      },
    });
    const chargeMap = new Map<string, number>();
    for (const ac of areaCharges) {
      chargeMap.set(ac.privateAreaId, Number(ac.amount));
    }

    const properties: PreviewPropertyResult[] = [];
    let withCommerce = 0;
    let withoutCommerce = 0;
    let willChargeCount = 0;
    let skippedCount = 0;
    let totalAmountToCharge = 0;

    for (const area of privateAreas) {
      const activeRental = area.rentals[0] as any;
      const hasCommerce = !!activeRental;
      const commerceName = activeRental?.commerce?.name || activeRental?.tenantName || null;

      if (hasCommerce) withCommerce++;
      else withoutCommerce++;

      let willCharge = false;
      let reason = "";

      if (req.targetType === "COMERCIO") {
        if (hasCommerce) {
          willCharge = true;
          reason = "Tiene comercio activo";
        } else {
          reason = "No tiene comercio activo";
        }
      } else {
        // PROPIETARIO
        if (hasCommerce) {
          reason = `Omitido: tiene comercio activo (${commerceName})`;
        } else {
          willCharge = true;
          reason = "Se cargará al propietario";
        }
      }

      const amountPerMonth = chargeMap.get(area.id) || 0;
      const totalAmount = amountPerMonth * req.months.length;

      if (willCharge) {
        willChargeCount++;
        totalAmountToCharge += totalAmount;
      } else {
        skippedCount++;
      }

      properties.push({
        privateAreaId: area.id,
        privateAreaName: area.name,
        hasCommerce,
        commerceName,
        willCharge,
        reason,
        amountPerMonth,
        totalAmount,
      });
    }

    return {
      zone: req.zone,
      chargeGroupName: chargeGroup.name,
      targetType: req.targetType,
      months: req.months,
      year: req.year,
      concept: req.concept,
      startDay: req.startDay,
      dueDay: req.dueDay,
      properties,
      summary: {
        totalProperties: privateAreas.length,
        withCommerce,
        withoutCommerce,
        willChargeCount,
        skippedCount,
        totalAmountToCharge,
      },
    };
  }

  async createMassCharges(
    req: CreateMassChargeRequest,
    previewCache: PreviewPropertyResult[]
  ): Promise<CreateMassChargeResult> {
    const propertiesToCharge = previewCache.filter((p) => req.selectedPrivateAreaIds.includes(p.privateAreaId));
    
    if (propertiesToCharge.length === 0) {
      return { success: false, error: "No se seleccionaron propiedades validas para cobrar." };
    }

    const payload: any[] = [];
    const now = new Date();

    for (const prop of propertiesToCharge) {
      for (const month of req.months) {
        // Build Due Date logic
        let dueDate: Date | null = null;
        try {
          const m = Math.max(1, Math.min(12, month));
          const maxDaysInMonth = new Date(req.year, m, 0).getDate();
          const validDueDay = Math.min(req.dueDay, maxDaysInMonth);
          dueDate = new Date(req.year, m - 1, validDueDay, 23, 59, 59);
        } catch (e) {
           console.error("Error formatting due date", e);
        }

        payload.push({
          condominiumId: req.condominiumId,
          privateAreaId: prop.privateAreaId,
          chargeGroupId: req.chargeGroupId,
          responsibility: "OWNER", 
          periodYear: req.year,
          periodMonth: month,
          amount: prop.amountPerMonth,
          concept: req.concept, 
          dueDate,
          status: "OPEN",
          isCollectible: true,
          createdAt: now,
        });
      }
    }

    // Insert all in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.charge.createMany({
        data: payload,
      });
    });

    return {
      success: true,
      chargesCreated: payload.length,
    };
  }
}
