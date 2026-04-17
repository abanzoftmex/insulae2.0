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
  privateAreasWithUseType: string;
  totalPrivateAreaM2: string;
  activeUsers: string;
  projectDocumentCount: string;
  activeRatio: number;
  updatedAtLabel: string;
}

export function toCondominiumOverviewVM(overview: CondominiumOverview): CondominiumOverviewVM {
  const totalPrivateAreas = overview.activePrivateAreas + overview.inactivePrivateAreas;
  const activeRatio = totalPrivateAreas > 0 ? (overview.activePrivateAreas / totalPrivateAreas) * 100 : 0;
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
    totalM2: overview.totalM2.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
    totalApoles: overview.totalApoles.toLocaleString("es-MX"),
    commonAreasM2: overview.commonAreasM2.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
    developedBy: overview.developedBy ?? "Sin definir",
    usesLandUseFormula: overview.usesLandUseFormula ? "Si" : "No",
    hasVccc: overview.hasVccc ? "Si" : "No",
    condominiumLogoUrl: overview.condominiumLogoUrl ?? "",
    condominiumImageUrl: overview.condominiumImageUrl ?? "",
    footerLogoUrl: overview.footerLogoUrl ?? "",
    privacyNoticePdfUrl: overview.privacyNoticePdfUrl ?? "",
    footerLeft: overview.footerLeft ?? "Sin texto configurado",
    footerRight: overview.footerRight ?? "Sin texto configurado",
    activePrivateAreas: overview.activePrivateAreas.toLocaleString("es-MX"),
    inactivePrivateAreas: overview.inactivePrivateAreas.toLocaleString("es-MX"),
    privateAreasWithUseType: overview.privateAreasWithUseType.toLocaleString("es-MX"),
    totalPrivateAreaM2: overview.totalPrivateAreaM2.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
    activeUsers: overview.activeUsers.toLocaleString("es-MX"),
    projectDocumentCount: overview.projectDocumentCount.toLocaleString("es-MX"),
    activeRatio,
    updatedAtLabel: new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(overview.lastUpdatedAt),
  };
}
