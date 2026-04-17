"use server";

import { revalidatePath } from "next/cache";

import {
  toPrivateAreaStatus,
  toPrivateAreaStatusFromLegacy,
  type PrivateAreaStatus,
} from "@/shared/domain/private-area-status";
import { prisma } from "@/shared/infrastructure/db/prisma";

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

  await prisma.privateArea.update({
    where: { id: privateAreaId },
    data: {
      isActive: nextStatus === "ACTIVE",
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
