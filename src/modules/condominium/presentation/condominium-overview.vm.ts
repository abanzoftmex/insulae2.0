import type { CondominiumOverview } from "../domain/condominium-overview";

export interface CondominiumOverviewVM {
  condominiumName: string;
  condominiumSlug: string;
  projectId: string;
  projectName: string;
  projectInitials: string;
  projectDescription: string;
  privacyNoticeText: string;
  startYear: string;
  condominiumFormat: string;
  condominiumFormatId: string;
  totalM2: string;
  totalApoles: string;
  commonAreasM2: string;
  privateAreasM2: string;
  developedBy: string;
  usesLandUseFormula: string;
  hasVccc: string;
  condominiumLogoUrl: string;
  condominiumImageUrl: string;
  footerLogoUrl: string;
  privacyNoticePdfUrl: string;
  footerLeft: string;
  footerRight: string;
  activePrivateAreas: string;
  inactivePrivateAreas: string;
  realActiveParentAreas: number;
  totalCapacityApoles: number;
  privateAreasWithUseType: string;
  totalPrivateAreaM2: string;
  activeUsers: string;
  projectDocumentCount: string;
  activeRatio: number;
  updatedAtLabel: string;
  cus: string;
  cusPermitido: string;
  barrios: string;
  totalConstruccion: string;
  cosPrivativo: string;
  cosComun: string;
}

export function toCondominiumOverviewVM(overview: CondominiumOverview): CondominiumOverviewVM {
  const totalConfiguredApoles = overview.totalApoles ?? 0;
  // Use the configured totalApoles as the denominator if set; otherwise fall back to active count.
  const denominator = totalConfiguredApoles > 0 ? totalConfiguredApoles : overview.activePrivateAreas;
  const activeRatio = denominator > 0 ? Math.min((overview.activePrivateAreas / denominator) * 100, 100) : 0;
  const condominiumFormatById: Record<number, string> = {
    1: "Vertical",
    2: "Horizontal",
    3: "Mixto",
  };

  return {
    condominiumName: overview.condominiumName,
    condominiumSlug: overview.condominiumSlug,
    projectId: overview.projectId ?? "",
    projectName: overview.projectName ?? "Proyecto principal",
    projectInitials: overview.projectInitials ?? "--",
    projectDescription:
      overview.projectDescription ??
      "Configura aqui la identidad y parametros operativos del condominio.",
    privacyNoticeText: overview.privacyNoticeText ?? "",
    startYear: overview.startYear ? overview.startYear.toString() : "Sin definir",
    condominiumFormat: overview.condominiumFormatId
      ? (condominiumFormatById[overview.condominiumFormatId] ?? `Formato ${overview.condominiumFormatId}`)
      : "Sin definir",
    condominiumFormatId: overview.condominiumFormatId ? overview.condominiumFormatId.toString() : "",
    totalM2: (overview.commonAreasM2 + overview.privateAreasM2).toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }),
    totalApoles: overview.totalApoles.toLocaleString("es-MX"),
    commonAreasM2: overview.commonAreasM2.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }),
    privateAreasM2: overview.privateAreasM2.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }),
    developedBy: overview.developedBy ?? "Sin definir",
    usesLandUseFormula: overview.usesLandUseFormula ? "Si" : "No",
    hasVccc: overview.hasVccc ? "Si" : "No",
    cus: overview.cus !== null ? overview.cus.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }) : "Sin definir",
    cusPermitido: overview.cusPermitido !== null ? overview.cusPermitido.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }) : "Sin definir",
    barrios: overview.barrios !== null ? overview.barrios.toLocaleString("es-MX") : "Sin definir",
    totalConstruccion: overview.totalConstruccion !== null ? overview.totalConstruccion.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }) : "Sin definir",
    cosPrivativo: overview.cosPrivativo !== null ? overview.cosPrivativo.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }) + "%" : "Sin definir",
    cosComun: overview.cosComun !== null ? overview.cosComun.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }) + "%" : "Sin definir",
    condominiumLogoUrl: overview.condominiumLogoUrl ?? "",
    condominiumImageUrl: overview.condominiumImageUrl ?? "",
    footerLogoUrl: overview.footerLogoUrl ?? "",
    privacyNoticePdfUrl: overview.privacyNoticePdfUrl ?? "",
    footerLeft: overview.footerLeft ?? "Sin texto configurado",
    footerRight: overview.footerRight ?? "Sin texto configurado",
    activePrivateAreas: overview.activePrivateAreas.toLocaleString("es-MX"),
    inactivePrivateAreas: overview.inactivePrivateAreas.toLocaleString("es-MX"),
    realActiveParentAreas: overview.activePrivateAreas,
    totalCapacityApoles: totalConfiguredApoles,
    privateAreasWithUseType: overview.privateAreasWithUseType.toLocaleString("es-MX"),
    totalPrivateAreaM2: overview.totalPrivateAreaM2.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }),
    activeUsers: overview.activeUsers.toLocaleString("es-MX"),
    projectDocumentCount: overview.projectDocumentCount.toLocaleString("es-MX"),
    activeRatio,
    updatedAtLabel: new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Mexico_City",
    }).format(overview.lastUpdatedAt),
  };
}
