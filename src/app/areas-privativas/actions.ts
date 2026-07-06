"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

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
  revalidatePath("/areas-privativas/formulario-apol");
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
      m2Apole: true,
      parentPrivateAreaId: true,
    },
  });

  if (!privateArea) {
    return;
  }

  const m2Updated = toNumber(formData.get("m2Updated"));
  const m2Original = toNumber(formData.get("m2Original"));
  const name = toString(formData.get("name"));
  const level = toString(formData.get("level"));
  const indiviso = toNumber(formData.get("indiviso"));
  const sortOrder = toNumber(formData.get("sortOrder"));
  const useType = toString(formData.get("useType"));
  const zoneId = toString(formData.get("zoneId"));
  const landUseId = toString(formData.get("landUseId"));
  const status = parsePrivateAreaStatus(formData);
  const parentPrivateAreaIdInput = toString(formData.get("parentPrivateAreaId"));
  const m2Construction = toNumber(formData.get("m2Construction"));
  const m2ConstructionCommonArea = toNumber(formData.get("m2ConstructionCommonArea"));
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

  const project = await prisma.project.findFirst({
    where: { condominiumId: privateArea.condominiumId },
    select: { totalM2: true, commonAreasM2: true },
  });

  const finalParentId = parentPrivateAreaId === undefined ? privateArea.parentPrivateAreaId : parentPrivateAreaId;
  let parentM2ConstructionChildren: number | null = null;
  if (finalParentId) {
    const parentArea = await prisma.privateArea.findUnique({
      where: { id: finalParentId },
      select: { m2ConstructionChildren: true }
    });
    parentM2ConstructionChildren = parentArea?.m2ConstructionChildren ? Number(parentArea.m2ConstructionChildren) : null;
  }

  const areaM2 = m2Updated !== null ? m2Updated : Number(privateArea.m2Apole);
  const denominator = finalParentId ? (parentM2ConstructionChildren || 0) : Number(project?.totalM2 || 0);
  const computedIndiviso = denominator > 0 ? areaM2 / denominator : 0;
  const calculatedM2CommonArea = computedIndiviso * Number(project?.commonAreasM2 || 0);

  await prisma.privateArea.update({
    where: { id: privateAreaId },
    data: {
      ...(formData.has("name") ? { name: name.length > 0 ? name : privateArea.name } : {}),
      ...(formData.has("level") ? { level: level.length > 0 ? level : null } : {}),
      ...(m2Updated !== null ? { m2Apole: m2Updated } : {}),
      ...(formData.has("m2Original") && m2Original !== null ? { m2Original } : {}),
      ...(indiviso !== null ? { indiviso } : {}),
      ...(formData.has("sortOrder") && sortOrder !== null ? { sortOrder } : {}),
      ...(resolvedZone !== undefined ? { zone: resolvedZone } : {}),
      ...(resolvedUseType !== undefined
        ? { useType: resolvedUseType }
        : { useType: useType.length > 0 ? useType : null }),
      ...(status !== undefined ? { status } : {}),
      ...parentPrivateAreaUpdate,
      ...(formData.has("isFusion") ? { isFusion } : {}),
      ...(m2Construction !== null ? { m2Construction } : {}),
      ...(formData.has("m2ConstructionCommonArea") ? { m2ConstructionCommonArea } : {}),
      m2CommonArea: calculatedM2CommonArea,
      ...(m2ConstructionChildren !== null ? { m2ConstructionChildren } : {}),
      ...(m2CommonAreaChildren !== null ? { m2CommonAreaChildren } : {}),
      ...(vccc !== null ? { vccc } : {}),
      updatedBy: userName,
    },
  });

  revalidatePath("/areas-privativas");
  revalidatePath("/reporte-condominio");
  await revalidatePrivateAreaFormPath(privateAreaId);
  redirect(`/areas-privativas/formulario-apol?id=${privateAreaId}`);
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
  redirect(`/areas-privativas/formulario-apol?id=${privateAreaId}`);
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
  redirect(`/areas-privativas/formulario-apol?id=${privateAreaId}`);
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
  revalidatePath("/areas-privativas/listado-arrendamientos");
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
  redirect(`/areas-privativas/formulario-apol?id=${privateAreaId}`);
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
  redirect(`/areas-privativas/formulario-apol?id=${privateAreaId}`);
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
  redirect(`/areas-privativas/formulario-apol?id=${privateAreaId}`);
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
  revalidatePath("/areas-privativas/listado-arrendamientos");
  await revalidatePrivateAreaFormPath(privateAreaId);
  redirect(`/areas-privativas/formulario-apol?id=${privateAreaId}`);
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
  const level = toString(formData.get("level"));
  const sortOrder = toNumber(formData.get("sortOrder")) ?? 0;
  const m2Updated = toNumber(formData.get("m2Updated"));
  const m2Original = toNumber(formData.get("m2Original"));
  const m2Construction = toNumber(formData.get("m2Construction"));
  const m2ConstructionCommonArea = toNumber(formData.get("m2ConstructionCommonArea"));
  const vccc = toNumber(formData.get("vccc"));
  
  const isFusionValue = toString(formData.get("isFusion")).toLowerCase();
  const isFusion = isTruthyFusion(isFusionValue);

  const zoneId = toString(formData.get("zoneId"));
  const landUseId = toString(formData.get("landUseId"));
  const administratorId = toString(formData.get("administratorId"));
  const parentPrivateAreaIdInput = toString(formData.get("parentPrivateAreaId"));

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

  const project = await prisma.project.findFirst({
    where: { condominiumId: condominium.id },
    select: { totalM2: true, commonAreasM2: true },
  });

  let parentM2ConstructionChildren: number | null = null;
  if (parentPrivateAreaIdInput.length > 0) {
    const parentArea = await prisma.privateArea.findUnique({
      where: { id: parentPrivateAreaIdInput },
      select: { m2ConstructionChildren: true }
    });
    parentM2ConstructionChildren = parentArea?.m2ConstructionChildren ? Number(parentArea.m2ConstructionChildren) : null;
  }

  const areaM2 = m2Updated !== null ? m2Updated : 0;
  const denominator = parentPrivateAreaIdInput.length > 0 ? (parentM2ConstructionChildren || 0) : Number(project?.totalM2 || 0);
  const computedIndiviso = denominator > 0 ? areaM2 / denominator : 0;
  const calculatedM2CommonArea = computedIndiviso * Number(project?.commonAreasM2 || 0);

  // Crear la área privativa en una transacción para poder asignar el administrador
  const newArea = await prisma.$transaction(async (tx) => {
    const area = await tx.privateArea.create({
      data: {
        condominiumId: condominium.id,
        name,
        code: code.length > 0 ? code : null,
        level: level.length > 0 ? level : null,
        sortOrder,
        m2Apole: m2Updated,
        m2Original: m2Original,
        m2Construction,
        m2ConstructionCommonArea,
        m2CommonArea: calculatedM2CommonArea,
        vccc,
        isFusion,
        zone: resolvedZone,
        useType: resolvedUseType,
        status: "UNASSIGNED",
        isActive: true,
        updatedBy: userName,
        parentPrivateAreaId: parentPrivateAreaIdInput.length > 0 ? parentPrivateAreaIdInput : null,
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

    const cleanKey = (key: string): string => {
      return key
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    };

    const getVal = (row: any, aliases: string[]): any => {
      const cleanedAliases = aliases.map(cleanKey);
      for (const k of Object.keys(row)) {
        if (cleanedAliases.includes(cleanKey(k))) {
          return row[k];
        }
      }
      return undefined;
    };

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
        return str === "SI" || str === "TRUE" || str === "1" || str === "ACTIVO" || str === "ACTIVA";
      }
      if (typeof val === "number") return val === 1;
      return false;
    };

    // Fetch all existing private areas for the condominium at once
    const allExisting = await prisma.privateArea.findMany({
      where: { condominiumId: condominium.id }
    });

    const existingById = new Map(allExisting.map(a => [a.id, a]));
    const existingByCode = new Map<string, typeof allExisting[0]>();
    for (const a of allExisting) {
      if (a.code && !existingByCode.has(a.code)) {
        existingByCode.set(a.code, a);
      }
    }
    const existingByName = new Map(allExisting.map(a => [a.name.trim().toLowerCase(), a]));

    async function runInChunks<T>(items: T[], chunkSize: number, fn: (item: T) => Promise<any>) {
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await Promise.all(chunk.map(fn));
      }
    }

    const operations: Array<{ type: "create" | "update"; id?: string; data: any }> = [];
    const createdOrUpdatedIds = new Map<string, string>(); // maps row identifier to final DB ID

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const name = getVal(row, ["Nombre", "Name"])?.trim() || "";
      if (!name) continue;

      let code = getVal(row, ["Código", "Codigo", "Code"])?.trim() || null;
      if (code === "-") {
        code = null;
      }
      const id = getVal(row, ["ID", "Id"])?.trim() || null;

      const rawStatus = getVal(row, ["Estatus", "Status", "estado"]);
      const parsedStatus = toPrivateAreaStatus(rawStatus?.trim());

      let isActiveVal = (getVal(row, ["Activo", "Active", "activo", "active"]) !== undefined && getVal(row, ["Activo", "Active", "activo", "active"]) !== "") 
        ? parseBool(getVal(row, ["Activo", "Active", "activo", "active"])) 
        : true;

      // Force main system parent folders/lots to be active so their children are visible
      const upperName = name.trim().toUpperCase();
      if (
        upperName === "ESTACIONAMIENTO" || 
        upperName === "AREAS COMUNES CALLES" || 
        upperName === "AREAS COMUNES ZONA DE EQUIPAMIENTO" ||
        /^(?:FAP:\s*)?SV\d+$/i.test(name.trim())
      ) {
        isActiveVal = true;
      }

      const rowZone = getVal(row, ["Zona", "Zone"])?.trim() || "";
      const isStreet = code === "AC" || rowZone.startsWith("Áreas comun");

      let m2CommonAreaVal = parseDecimal(getVal(row, ["M2 Comunes", "M2 Áreas Comunes", "M2 Areas Comunes", "M2 Common Area"]));
      let m2ConstructionCommonAreaVal = parseDecimal(getVal(row, ["M2 Construcción Áreas Comunes", "M2 Construccion Areas Comunes", "M2 de Construcción de Áreas Comunes", "M2 de Construccion de Areas Comunes"]));

      if (isStreet) {
        if (m2ConstructionCommonAreaVal === null) {
          m2ConstructionCommonAreaVal = m2CommonAreaVal;
        }
        m2CommonAreaVal = null; // Clear duplicate representation for streets in DB
      }

      const baseData = {
        condominiumId: condominium.id,
        code,
        name,
        sortOrder: idx + 1,
        zone: rowZone || null,
        subzone: getVal(row, ["Subzona", "Subzone"])?.trim() || null,
        street: getVal(row, ["Calle", "Street"])?.trim() || null,
        useType: getVal(row, ["Tipo Uso", "Tipo de Uso", "Use Type", "useType"])?.trim() || null,
        status: parsedStatus as any,
        m2Original: parseDecimal(getVal(row, ["M2 Original", "original m2"])),
        m2Apole: parseDecimal(getVal(row, ["M2 Actual", "actual m2", "M2 Apole", "m2 apole"])),
        m2Construction: parseDecimal(getVal(row, ["M2 Construcción", "M2 Construccion", "M2 Construction"])),
        m2CommonArea: m2CommonAreaVal,
        m2ConstructionChildren: parseDecimal(getVal(row, ["M2 Construcción Hijos", "M2 Construccion Hijos", "M2 Construction Children"])),
        m2CommonAreaChildren: parseDecimal(getVal(row, ["M2 Comunes Hijos", "M2 Common Area Children"])),
        m2ConstructionCommonArea: m2ConstructionCommonAreaVal,
        indiviso: parseDecimal(getVal(row, ["Indiviso", "indiviso"])),
        vccc: parseDecimal(getVal(row, ["VCCC", "vccc"])),
        isFusion: parseBool(getVal(row, ["Es Fusión", "Es Fusion", "Is Fusion", "isFusion"])),
        isActive: isActiveVal,
        level: getVal(row, ["Nivel", "Level", "nivel", "level"])?.trim() || null,
      };

      let existing = null;
      if (id) {
        existing = existingById.get(id);
      } else if (code) {
        existing = existingByCode.get(code);
      } else {
        existing = existingByName.get(name.trim().toLowerCase());
      }

      if (existing) {
        operations.push({
          type: "update",
          id: existing.id,
          data: baseData,
        });
        createdOrUpdatedIds.set(id || code || name.trim().toLowerCase(), existing.id);
      } else {
        const newId = id || randomUUID();
        operations.push({
          type: "create",
          data: { id: newId, ...baseData },
        });
        createdOrUpdatedIds.set(id || code || name.trim().toLowerCase(), newId);
      }
    }

    if (operations.length > 0) {
      await runInChunks(operations, 50, async (op) => {
        if (op.type === "update") {
          await prisma.privateArea.update({
            where: { id: op.id },
            data: op.data,
          });
        } else {
          await prisma.privateArea.create({
            data: op.data,
          });
        }
      });
    }

    // Rebuild lookup map to resolve parents using the latest database records
    const allLatest = await prisma.privateArea.findMany({
      where: { condominiumId: condominium.id }
    });
    const latestByCode = new Map(allLatest.filter(a => a.code).map(a => [a.code!, a]));
    const latestById = new Map(allLatest.map(a => [a.id, a]));
    const latestByName = new Map(allLatest.map(a => [a.name.trim().toLowerCase(), a]));

    const parentUpdates: Array<{ id: string; parentId: string | null }> = [];

    for (const row of rows) {
      let code = getVal(row, ["Código", "Codigo", "Code"])?.trim();
      if (code === "-") {
        code = undefined;
      }
      const id = getVal(row, ["ID", "Id"])?.trim();
      const name = getVal(row, ["Nombre", "Name"])?.trim() || "";
      
      let child = null;
      if (id) {
        child = latestById.get(id);
      } else if (code) {
        child = latestByCode.get(code);
      } else if (name) {
        child = latestByName.get(name.trim().toLowerCase());
      }

      if (child) {
        let parentId: string | null = child.parentPrivateAreaId;

        const parentCodeVal = getVal(row, ["Código Padre", "Codigo Padre", "Parent Code", "parentCode"]);
        if (parentCodeVal !== undefined) {
          let parentCode = typeof parentCodeVal === "string" ? parentCodeVal.trim() : "";
          if (parentCode === "-") {
            parentCode = "";
          }
          
          if (parentCode !== "") {
            let parent = latestByCode.get(parentCode);
            if (!parent) {
              parent = latestByName.get(parentCode.toLowerCase());
            }

            if (parent) {
              parentId = parent.id;
            } else {
              parentId = null;
            }
          } else {
            parentId = null;
          }
        }

        // If parentId is still null/cleared, check if this is a street under "Áreas comunes" to group under "Áreas comunes Calles"
        if (parentId === null && child.zone && child.zone.startsWith("Áreas comun") && child.code === "AC" && child.name !== "Áreas comunes Calles" && child.name !== "Áreas comunes zona de equipamiento") {
          const defaultParent = [...latestById.values()].find(p => p.name === "Áreas comunes Calles");
          if (defaultParent) {
            parentId = defaultParent.id;
          }
        }

        if (child.parentPrivateAreaId !== parentId) {
          parentUpdates.push({
            id: child.id,
            parentId,
          });
        }
      }
    }

    if (parentUpdates.length > 0) {
      await runInChunks(parentUpdates, 50, async (up) => {
        await prisma.privateArea.update({
          where: { id: up.id },
          data: { parentPrivateAreaId: up.parentId },
        });
      });
    }
    
    revalidatePath("/areas-privativas");
    return { success: true };
  } catch (error: any) {
    console.error("[Import CSV Error]", error);
    return { success: false, error: error.message };
  }
}

export async function cancelPaymentAction(paymentId: string): Promise<void> {
  if (!paymentId) return;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        allocations: true,
      },
    });

    if (!payment) return;

    // 1. Cancel payment status
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        legacyStatusCode: 2,
        isLegacyActive: false,
        isVisibleInFinancialSummary: false,
      },
    });

    // 2. Deactivate details
    await tx.paymentDetail.updateMany({
      where: { paymentId },
      data: { isActive: false },
    });

    // 3. Revert charge allocations and status
    for (const alloc of payment.allocations) {
      const charge = await tx.charge.findUnique({
        where: { id: alloc.chargeId },
      });
      if (charge) {
        const newPaidAmount = Math.max(0, Number(charge.paidAmount) - Number(alloc.amount));
        const newStatus = newPaidAmount === 0 ? "OPEN" : "PARTIAL";
        await tx.charge.update({
          where: { id: alloc.chargeId },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
          },
        });
      }
    }

    // 4. Delete allocations
    await tx.paymentAllocation.deleteMany({
      where: { paymentId },
    });
  });

  revalidatePath("/areas-privativas");
  revalidatePath("/areas-privativas/listado-pagos");
  revalidatePath("/areas-privativas/historico-pagos");
  revalidatePath("/reporte-cuotas");
  revalidatePath("/reporte-cuotas-extraordinarias");
}

export async function savePrivateAreaImageAction(input: {
  privateAreaId: string;
  condominiumId: string;
  url: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  slotIndex: number;
}): Promise<void> {
  await prisma.privateAreaImage.upsert({
    where: {
      privateAreaId_slotIndex: {
        privateAreaId: input.privateAreaId,
        slotIndex: input.slotIndex,
      },
    },
    update: {
      url: input.url,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
    },
    create: {
      condominiumId: input.condominiumId,
      privateAreaId: input.privateAreaId,
      url: input.url,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      slotIndex: input.slotIndex,
    },
  });

  revalidatePath("/areas-privativas/formulario-apol-imagenes");
}

export async function deletePrivateAreaImageAction(input: {
  privateAreaId: string;
  slotIndex: number;
}): Promise<void> {
  await prisma.privateAreaImage.delete({
    where: {
      privateAreaId_slotIndex: {
        privateAreaId: input.privateAreaId,
        slotIndex: input.slotIndex,
      },
    },
  });

  revalidatePath("/areas-privativas/formulario-apol-imagenes");
}

