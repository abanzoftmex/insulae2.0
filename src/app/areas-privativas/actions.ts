"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toPrivateAreaStatus, toPrivateAreaStatusFromLegacy, type PrivateAreaStatus } from "@/shared/domain/private-area-status";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCurrentUser } from "@/app/actions/auth";
import { PROJECT_SCOPE } from "@/config/project-scope";

function toNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function toString(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function toDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function isTruthyFusion(rawValue: string): boolean {
  const normalized = rawValue.trim().toLowerCase();
  return (
    normalized === "on" ||
    normalized === "true" ||
    normalized === "1" ||
    normalized === "2"
  );
}

function parsePrivateAreaStatus(formData: FormData): PrivateAreaStatus | undefined {
  const statusValue = toString(formData.get("status"));
  if (statusValue.length > 0) {
    return toPrivateAreaStatus(statusValue);
  }

  // Backward compatibility: legacy forms may still submit legacyStatusId.
  if (formData.has("legacyStatusId")) {
    const legacyStatusId = toNumber(formData.get("legacyStatusId"));
    const normalizedLegacyStatusId =
      legacyStatusId === null ? null : Math.trunc(legacyStatusId);
    return toPrivateAreaStatusFromLegacy(normalizedLegacyStatusId);
  }

  return undefined;
}

async function revalidatePrivateAreaFormPath(privateAreaId: string): Promise<void> {
  revalidatePath(`/areas-privativas/formulario-apol?id=${privateAreaId}`);
}

export async function updatePrivateAreaSnapshotAction(formData: FormData): Promise<void> {
  const privateAreaId = toString(formData.get("privateAreaId"));
  if (!privateAreaId) {
    return;
  }

  const privateArea = await prisma.privateArea.findUnique({
    where: { id: privateAreaId },
    select: {
      id: true,
      condominiumId: true,
      name: true,
    },
  });

  if (!privateArea) {
    return;
  }

  const m2Updated = toNumber(formData.get("m2Updated"));
  const m2Original = toNumber(formData.get("m2Original"));
  const name = toString(formData.get("name"));
  const indiviso = toNumber(formData.get("indiviso"));
  const useType = toString(formData.get("useType"));
  const zoneId = toString(formData.get("zoneId"));
  const landUseId = toString(formData.get("landUseId"));
  const status = parsePrivateAreaStatus(formData);
  const parentPrivateAreaIdInput = toString(formData.get("parentPrivateAreaId"));
  const m2Construction = toNumber(formData.get("m2Construction"));
  const m2CommonArea = toNumber(formData.get("m2CommonArea"));
  const m2ConstructionChildren = toNumber(formData.get("m2ConstructionChildren"));
  const m2CommonAreaChildren = toNumber(formData.get("m2CommonAreaChildren"));
  const vccc = toNumber(formData.get("vccc"));
  const isFusionValue = toString(formData.get("isFusion")).toLowerCase();
  const isFusion = isTruthyFusion(isFusionValue);

  let resolvedZone: string | null | undefined;
  if (formData.has("zoneId")) {
    if (zoneId.length > 0) {
      const zone = await prisma.zoneCatalog.findFirst({
        where: {
          condominiumId: privateArea.condominiumId,
          id: zoneId,
          isActive: true,
        },
        select: { name: true },
      });

      resolvedZone = zone?.name ?? null;
    } else {
      resolvedZone = null;
    }
  }

  let resolvedUseType: string | null | undefined;
  if (formData.has("landUseId")) {
    if (landUseId.length > 0) {
      const landUse = await prisma.landUseCatalog.findFirst({
        where: {
          condominiumId: privateArea.condominiumId,
          id: landUseId,
          isActive: true,
        },
        select: { name: true },
      });

      resolvedUseType = landUse?.name ?? null;
    } else {
      resolvedUseType = null;
    }
  }

  let parentPrivateAreaId: string | null | undefined;
  if (formData.has("parentPrivateAreaId")) {
    if (parentPrivateAreaIdInput.length > 0) {
      const parent = await prisma.privateArea.findFirst({
        where: {
          condominiumId: privateArea.condominiumId,
          id: parentPrivateAreaIdInput,
        },
        select: { id: true },
      });

      parentPrivateAreaId = parent && parent.id !== privateAreaId ? parent.id : null;
    } else {
      parentPrivateAreaId = null;
    }
  }

  const parentPrivateAreaUpdate =
    parentPrivateAreaId === undefined
      ? {}
      : parentPrivateAreaId === null
        ? { parentPrivateArea: { disconnect: true } }
        : { parentPrivateArea: { connect: { id: parentPrivateAreaId } } };

  const userName = await getCurrentUser();

  await prisma.privateArea.update({
    where: { id: privateAreaId },
    data: {
      ...(formData.has("name") ? { name: name.length > 0 ? name : privateArea.name } : {}),
      ...(m2Updated !== null ? { m2Apole: m2Updated } : {}),
      ...(formData.has("m2Original") && m2Original !== null ? { m2Original } : {}),
      ...(indiviso !== null ? { indiviso } : {}),
      ...(resolvedZone !== undefined ? { zone: resolvedZone } : {}),
      ...(resolvedUseType !== undefined
        ? { useType: resolvedUseType }
        : { useType: useType.length > 0 ? useType : null }),
      ...(status !== undefined ? { status } : {}),
      ...parentPrivateAreaUpdate,
      ...(formData.has("isFusion") ? { isFusion } : {}),
      ...(m2Construction !== null ? { m2Construction } : {}),
      ...(m2CommonArea !== null ? { m2CommonArea } : {}),
      ...(m2ConstructionChildren !== null ? { m2ConstructionChildren } : {}),
      ...(m2CommonAreaChildren !== null ? { m2CommonAreaChildren } : {}),
      ...(vccc !== null ? { vccc } : {}),
      updatedBy: userName,
    },
  });

  revalidatePath("/areas-privativas");
  revalidatePath("/reporte-condominio");
  await revalidatePrivateAreaFormPath(privateAreaId);
}

export async function togglePrivateAreaStatusAction(formData: FormData): Promise<void> {
  const privateAreaId = toString(formData.get("privateAreaId"));
  const nextStatus = toString(formData.get("nextStatus"));

  if (!privateAreaId || (nextStatus !== "ACTIVE" && nextStatus !== "INACTIVE")) {
    return;
  }

  const userName = await getCurrentUser();

  await prisma.privateArea.update({
    where: { id: privateAreaId },
    data: {
      isActive: nextStatus === "ACTIVE",
      updatedBy: userName,
    },
  });

  revalidatePath("/areas-privativas");
  revalidatePath("/reporte-condominio");
}

export async function updateOrdinaryAreaChargeAction(formData: FormData): Promise<void> {
  const privateAreaId = toString(formData.get("privateAreaId"));
  const amount = toNumber(formData.get("annualOrdinaryFee"));

  if (!privateAreaId || amount === null) {
    return;
  }

  const area = await prisma.privateArea.findUnique({
    where: { id: privateAreaId },
    select: {
      id: true,
      condominiumId: true,
    },
  });

  if (!area) {
    return;
  }

  let ordinaryGroup = await prisma.chargeGroup.findFirst({
    where: {
      condominiumId: area.condominiumId,
      isActive: true,
      name: {
        contains: "ordinaria",
        mode: "insensitive",
      },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
    },
  });

  if (!ordinaryGroup) {
    ordinaryGroup = await prisma.chargeGroup.create({
      data: {
        condominiumId: area.condominiumId,
        name: "Cuota ordinaria",
        chargeType: "ORDINARY",
        isActive: true,
      },
      select: { id: true },
    });
  }

  const existing = await prisma.areaCharge.findFirst({
    where: {
      condominiumId: area.condominiumId,
      privateAreaId: area.id,
      chargeGroupId: ordinaryGroup.id,
      isActive: true,
    },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
    },
  });

  if (existing) {
    await prisma.areaCharge.update({
      where: { id: existing.id },
      data: { amount },
    });
  } else {
    await prisma.areaCharge.create({
      data: {
        condominiumId: area.condominiumId,
        privateAreaId: area.id,
        chargeGroupId: ordinaryGroup.id,
        amount,
        isActive: true,
      },
    });
  }

  revalidatePath("/areas-privativas");
}

export async function createPrivateAreaRentalAction(formData: FormData): Promise<void> {
  const privateAreaId = toString(formData.get("privateAreaId"));
  const tenantName = toString(formData.get("tenantName"));
  const status = toString(formData.get("status"));
  const notes = toString(formData.get("notes"));
  const startsAt = toDate(formData.get("startsAt"));
  const endsAt = toDate(formData.get("endsAt"));

  if (!privateAreaId) {
    return;
  }

  const area = await prisma.privateArea.findUnique({
    where: { id: privateAreaId },
    select: {
      id: true,
      condominiumId: true,
    },
  });

  if (!area) {
    return;
  }

  await prisma.rental.create({
    data: {
      condominiumId: area.condominiumId,
      privateAreaId: area.id,
      tenantName: tenantName.length > 0 ? tenantName : null,
      startsAt,
      endsAt,
      status: status.length > 0 ? status : null,
      notes: notes.length > 0 ? notes : null,
    },
  });

  revalidatePath("/areas-privativas");
  revalidatePath(`/areas-privativas/listado-arrendamientos?id=${area.id}`);
}

function roleBucketToRoleName(roleBucket: string): string {
  if (roleBucket === "LEGAL") {
    return "Propietario legal";
  }

  if (roleBucket === "INITIAL") {
    return "Propietario inicial";
  }

  return "Dominio actual";
}

export async function addPrivateAreaAssignmentAction(formData: FormData): Promise<void> {
  const privateAreaId = toString(formData.get("privateAreaId"));
  const userId = toString(formData.get("userId"));
  const roleBucket = toString(formData.get("roleBucket"));

  if (!privateAreaId || !userId || !roleBucket) {
    return;
  }

  const [area, user] = await Promise.all([
    prisma.privateArea.findUnique({
      where: { id: privateAreaId },
      select: {
        id: true,
        condominiumId: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        condominiumId: true,
      },
    }),
  ]);

  if (!area || !user || user.condominiumId !== area.condominiumId) {
    return;
  }

  const roleName = roleBucketToRoleName(roleBucket);

  const existing = await prisma.residentAssignment.findFirst({
    where: {
      condominiumId: area.condominiumId,
      privateAreaId: area.id,
      userId: user.id,
      roleName,
      isActive: true,
    },
    select: { id: true },
  });

  if (!existing) {
    await prisma.residentAssignment.create({
      data: {
        condominiumId: area.condominiumId,
        privateAreaId: area.id,
        userId: user.id,
        roleName,
        startsAt: new Date(),
        isActive: true,
      },
    });
  }

  revalidatePath("/areas-privativas");
  await revalidatePrivateAreaFormPath(privateAreaId);
}

export async function removePrivateAreaAssignmentAction(formData: FormData): Promise<void> {
  const privateAreaId = toString(formData.get("privateAreaId"));
  const assignmentId = toString(formData.get("assignmentId"));

  if (!privateAreaId || !assignmentId) {
    return;
  }

  await prisma.residentAssignment.update({
    where: { id: assignmentId },
    data: {
      isActive: false,
      endsAt: new Date(),
    },
  });

  revalidatePath("/areas-privativas");
  await revalidatePrivateAreaFormPath(privateAreaId);
}

export async function setPrivateAreaAdministratorAction(formData: FormData): Promise<void> {
  const privateAreaId = toString(formData.get("privateAreaId"));
  const userId = toString(formData.get("userId"));

  if (!privateAreaId) {
    return;
  }

  const area = await prisma.privateArea.findUnique({
    where: { id: privateAreaId },
    select: {
      id: true,
      condominiumId: true,
    },
  });

  if (!area) {
    return;
  }

  await prisma.residentAssignment.updateMany({
    where: {
      condominiumId: area.condominiumId,
      privateAreaId: area.id,
      isActive: true,
      roleName: {
        contains: "administrador",
        mode: "insensitive",
      },
    },
    data: {
      isActive: false,
      endsAt: new Date(),
    },
  });

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        condominiumId: true,
      },
    });

    if (!user || user.condominiumId !== area.condominiumId) {
      return;
    }

    await prisma.residentAssignment.create({
      data: {
        condominiumId: area.condominiumId,
        privateAreaId: area.id,
        userId: user.id,
        roleName: "Administrador del subcondominio",
        startsAt: new Date(),
        isActive: true,
      },
    });
  }

  revalidatePath("/areas-privativas");
  await revalidatePrivateAreaFormPath(privateAreaId);
}

export async function setPrivateAreaRentalTenantAction(formData: FormData): Promise<void> {
  const privateAreaId = toString(formData.get("privateAreaId"));
  const tenantName = toString(formData.get("tenantName"));

  if (!privateAreaId) {
    return;
  }

  const area = await prisma.privateArea.findUnique({
    where: { id: privateAreaId },
    select: {
      id: true,
      condominiumId: true,
    },
  });

  if (!area) {
    return;
  }

  const latestRental = await prisma.rental.findFirst({
    where: {
      privateAreaId: area.id,
      condominiumId: area.condominiumId,
    },
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  if (latestRental) {
    await prisma.rental.update({
      where: { id: latestRental.id },
      data: {
        tenantName: tenantName.length > 0 ? tenantName : null,
      },
    });
  } else if (tenantName.length > 0) {
    await prisma.rental.create({
      data: {
        condominiumId: area.condominiumId,
        privateAreaId: area.id,
        tenantName,
      },
    });
  }

  revalidatePath("/areas-privativas");
  revalidatePath(`/areas-privativas/listado-arrendamientos?id=${area.id}`);
  await revalidatePrivateAreaFormPath(privateAreaId);
}

export async function createPrivateAreaChargeAction(formData: FormData): Promise<void> {
  const privateAreaId = toString(formData.get("privateAreaId"));
  const chargeGroupId = toString(formData.get("chargeGroupId"));
  const amount = toNumber(formData.get("amount"));
  const concept = toString(formData.get("concept"));
  const dueDate = toDate(formData.get("dueDate"));
  const chargeDate = toDate(formData.get("chargeDate")) ?? new Date();
  
  const responsibilityValue = toString(formData.get("responsibility")); // "OWNER" | "COMMERCE"
  const responsibility: "OWNER" | "COMMERCE" = responsibilityValue === "COMMERCE" ? "COMMERCE" : "OWNER";

  const periodYear = chargeDate.getUTCFullYear();
  const periodMonth = chargeDate.getUTCMonth() + 1;

  if (!privateAreaId || !chargeGroupId || amount === null || amount <= 0) {
    return;
  }

  const area = await prisma.privateArea.findUnique({
    where: { id: privateAreaId },
    select: {
      id: true,
      condominiumId: true,
    },
  });

  if (!area) {
    return;
  }

  let tenancyId: string | null = null;
  if (responsibility === "COMMERCE") {
    const latestRental = await prisma.rental.findFirst({
      where: {
        privateAreaId: area.id,
        condominiumId: area.condominiumId,
      },
      orderBy: { startsAt: "desc" },
      select: { id: true },
    });
    tenancyId = latestRental?.id ?? null;
  }

  await prisma.charge.create({
    data: {
      condominiumId: area.condominiumId,
      privateAreaId: area.id,
      chargeGroupId,
      amount,
      concept: concept.length > 0 ? concept : null,
      responsibility,
      periodYear,
      periodMonth,
      dueDate,
      status: "OPEN",
      tenancyId,
    },
  });

  revalidatePath("/areas-privativas");
  revalidatePath("/areas-privativas/listado-pagos");
  revalidatePath("/reporte-cuotas");
  revalidatePath("/reporte-cuotas-extraordinarias");
}
export async function updatePrivateAreaChargeAction(formData: FormData): Promise<void> {
  const chargeId = toString(formData.get("chargeId"));
  const chargeGroupId = toString(formData.get("chargeGroupId"));
  const amount = toNumber(formData.get("amount"));
  const concept = toString(formData.get("concept"));
  const dueDate = toDate(formData.get("dueDate"));
  const chargeDate = toDate(formData.get("chargeDate"));
  
  const periodYear = chargeDate?.getUTCFullYear();
  const periodMonth = chargeDate ? chargeDate.getUTCMonth() + 1 : undefined;

  if (!chargeId || !chargeGroupId || amount === null || amount <= 0) {
    return;
  }

  await prisma.charge.update({
    where: { id: chargeId },
    data: {
      chargeGroupId,
      amount,
      concept: concept.length > 0 ? concept : null,
      dueDate,
      ...(periodYear ? { periodYear } : {}),
      ...(periodMonth ? { periodMonth } : {}),
    },
  });

  revalidatePath("/areas-privativas");
  revalidatePath("/areas-privativas/listado-pagos");
  revalidatePath("/reporte-cuotas");
  revalidatePath("/reporte-cuotas-extraordinarias");
}

export async function deletePrivateAreaChargeAction(chargeId: string): Promise<void> {
  if (!chargeId) return;
  
  await prisma.charge.delete({
    where: { id: chargeId }
  });

  revalidatePath("/areas-privativas");
  revalidatePath("/areas-privativas/listado-pagos");
  revalidatePath("/reporte-cuotas");
  revalidatePath("/reporte-cuotas-extraordinarias");
}

export async function sendPrivateAreaStatementEmailAction(privateAreaId: string, opc: string): Promise<void> {
  // TODO: Implement actual email sending logic via Resend / NodeMailer / Sendgrid.
  // For now, this is a placeholder that simulates a successful email send.
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`Email sent for private area ${privateAreaId} with opc ${opc}`);
}

export async function createPrivateAreaAction(formData: FormData): Promise<void> {
  const name = toString(formData.get("name"));
  if (!name) {
    throw new Error("El nombre de la área privativa es obligatorio.");
  }

  // 1. Obtener el condominio activo
  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true },
  });

  if (!condominium) {
    throw new Error("No se encontró ningún condominio activo.");
  }

  const code = toString(formData.get("code"));
  const sortOrder = toNumber(formData.get("sortOrder")) ?? 0;
  const m2Updated = toNumber(formData.get("m2Updated"));
  const m2Original = toNumber(formData.get("m2Original"));
  const m2Construction = toNumber(formData.get("m2Construction"));
  const m2CommonArea = toNumber(formData.get("m2CommonArea"));
  const vccc = toNumber(formData.get("vccc"));
  
  const isFusionValue = toString(formData.get("isFusion")).toLowerCase();
  const isFusion = isTruthyFusion(isFusionValue);

  const zoneId = toString(formData.get("zoneId"));
  const landUseId = toString(formData.get("landUseId"));
  const administratorId = toString(formData.get("administratorId"));

  // Resolver nombre de la zona
  let resolvedZone: string | null = null;
  if (zoneId.length > 0) {
    const zone = await prisma.zoneCatalog.findFirst({
      where: { condominiumId: condominium.id, id: zoneId, isActive: true },
      select: { name: true },
    });
    resolvedZone = zone?.name ?? null;
  }

  // Resolver tipo de uso de suelo
  let resolvedUseType: string | null = null;
  if (landUseId.length > 0) {
    const landUse = await prisma.landUseCatalog.findFirst({
      where: { condominiumId: condominium.id, id: landUseId, isActive: true },
      select: { name: true },
    });
    resolvedUseType = landUse?.name ?? null;
  }

  const userName = await getCurrentUser();

  // Crear la área privativa en una transacción para poder asignar el administrador
  const newArea = await prisma.$transaction(async (tx) => {
    const area = await tx.privateArea.create({
      data: {
        condominiumId: condominium.id,
        name,
        code: code.length > 0 ? code : null,
        sortOrder,
        m2Apole: m2Updated,
        m2Original: m2Original,
        m2Construction,
        m2CommonArea,
        vccc,
        isFusion,
        zone: resolvedZone,
        useType: resolvedUseType,
        status: "UNASSIGNED",
        isActive: true,
        updatedBy: userName,
      },
    });

    if (administratorId.length > 0) {
      await tx.residentAssignment.create({
        data: {
          condominiumId: condominium.id,
          privateAreaId: area.id,
          userId: administratorId,
          roleName: "Administrador del subcondominio",
          startsAt: new Date(),
          isActive: true,
        },
      });
    }

    return area;
  });

  revalidatePath("/areas-privativas");
  revalidatePath("/reporte-condominio");

  // Redirigir a la pantalla de edición con un parámetro de éxito
  redirect(`/areas-privativas/formulario-apol?id=${newArea.id}&created=true`);
}

export async function deletePrivateAreaPermanentlyAction(formData: FormData): Promise<void> {
  const privateAreaId = toString(formData.get("privateAreaId"));
  if (!privateAreaId) return;

  await prisma.$transaction(async (tx) => {
    // Manually delete relations in case cascade isn't configured
    await tx.residentAssignment.deleteMany({ where: { privateAreaId } });
    await tx.rental.deleteMany({ where: { privateAreaId } });
    await tx.areaCharge.deleteMany({ where: { privateAreaId } });
    await tx.charge.deleteMany({ where: { privateAreaId } });
    await tx.privateArea.delete({ where: { id: privateAreaId } });
  });

  revalidatePath("/areas-privativas");
  revalidatePath("/reporte-condominio");
  redirect("/areas-privativas");
}

export async function importPrivateAreasCSVAction(rows: any[]) {
  try {
    const condominium = await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true },
    });
    if (!condominium) return { success: false, error: "Condominio no encontrado" };

    const parseDecimal = (val: any) => {
      if (val === null || val === undefined || val === "") return null;
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const num = Number(val.replace(/,/g, ""));
        return isNaN(num) ? null : num;
      }
      return null;
    };

    const parseBool = (val: any) => {
      if (val === null || val === undefined || val === "") return false;
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        const str = val.trim().toUpperCase();
        return str === "SI" || str === "TRUE" || str === "1";
      }
      if (typeof val === "number") return val === 1;
      return false;
    };

    for (const row of rows) {
      if (!row["Nombre"] || String(row["Nombre"]).trim() === "") continue;

      const parsedStatus = toPrivateAreaStatus(row["Estatus"]?.trim());

      const baseData = {
        condominiumId: condominium.id,
        code: row["Código"]?.trim() || null,
        name: row["Nombre"]?.trim() || "Sin Nombre",
        zone: row["Zona"]?.trim() || null,
        subzone: row["Subzona"]?.trim() || null,
        street: row["Calle"]?.trim() || null,
        useType: row["Tipo Uso"]?.trim() || null,
        status: parsedStatus as any,
        m2Original: parseDecimal(row["M2 Original"]),
        m2Apole: parseDecimal(row["M2 Actual"]),
        m2Construction: parseDecimal(row["M2 Construcción"]),
        m2CommonArea: parseDecimal(row["M2 Comunes"]),
        m2ConstructionChildren: parseDecimal(row["M2 Construcción Hijos"]),
        m2CommonAreaChildren: parseDecimal(row["M2 Comunes Hijos"]),
        indiviso: parseDecimal(row["Indiviso"]),
        vccc: parseDecimal(row["VCCC"]),
        isFusion: parseBool(row["Es Fusión"]),
        isActive: row["Activo"] !== undefined ? parseBool(row["Activo"]) : true,
      };

      if (row["ID"]) {
        const existing = await prisma.privateArea.findUnique({ where: { id: row["ID"] } });
        if (existing) {
          await prisma.privateArea.update({ where: { id: row["ID"] }, data: baseData });
        } else {
          await prisma.privateArea.create({ data: { id: row["ID"], ...baseData } });
        }
      } else if (row["Código"]) {
        const existing = await prisma.privateArea.findFirst({ where: { condominiumId: condominium.id, code: row["Código"] } });
        if (existing) {
          await prisma.privateArea.update({ where: { id: existing.id }, data: baseData });
        } else {
          await prisma.privateArea.create({ data: baseData });
        }
      } else {
        await prisma.privateArea.create({ data: baseData });
      }
    }

    for (const row of rows) {
      if (row["Código Padre"] && row["Código Padre"].trim() !== "") {
        const parentCode = row["Código Padre"].trim();
        const parent = await prisma.privateArea.findFirst({ where: { condominiumId: condominium.id, code: parentCode } });
        if (parent) {
          let child;
          if (row["ID"]) child = await prisma.privateArea.findUnique({ where: { id: row["ID"] } });
          else if (row["Código"]) child = await prisma.privateArea.findFirst({ where: { condominiumId: condominium.id, code: row["Código"] } });
          
          if (child) {
            await prisma.privateArea.update({ where: { id: child.id }, data: { parentPrivateAreaId: parent.id } });
          }
        }
      }
    }
    
    revalidatePath("/areas-privativas");
    return { success: true };
  } catch (error: any) {
    console.error("[Import CSV Error]", error);
    return { success: false, error: error.message };
  }
}
