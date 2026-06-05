import type { CondominiumReport } from "../domain/condominium-report";

export interface CondominiumReportRowVM {
  landUseName: string;
  landUseInitials: string;
  total: string;
  byZone: string[];
}

export interface CondominiumReportVM {
  condominiumName: string;
  condominiumSlug: string;
  projectName: string;
  projectTotalApoles: string;
  projectTotalM2: string;
  projectCommonAreasM2: string;
  totalRegisteredPrivateAreas: string;
  activePrivateAreas: string;
  inactivePrivateAreas: string;
  activeParents: string;
  activeChildren: string;
  inactiveParents: string;
  inactiveChildren: string;
  areasWithUseType: string;
  areasWithoutUseType: string;
  totalPrivateAreaM2: string;
  totalApoleAreaM2: string;
  totalBuiltAreaM2: string;
  totalIndiviso: string;
  availableAreas: string;
  builtAreas: string;
  parentAreasCount: string;
  parentAreasM2: string;
  parentAreasCommonM2: string;
  activeFusionsCount: string;
  classificationBaseTotal: string;
  classificationBaseLabel: string;
  classifiedAreas: string;
  unclassifiedAreas: string;
  availableRatio: string;
  builtRatio: string;
  availableRatioValue: number;
  builtRatioValue: number;
  classificationModeLabel: string;
  zones: string[];
  rows: CondominiumReportRowVM[];
  totalsByZone: string[];
  grandTotal: string;
  caveats: string[];
  updatedAtLabel: string;
  generatedAtLabel: string;
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("es-MX");
}

function formatNumber(value: number): string {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatNumber4(value: number): string {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("es-MX", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatPercent2(value: number): string {
  return `${value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function toCondominiumReportVM(report: CondominiumReport): CondominiumReportVM {
  const classificationModeLabel =
    report.classificationMode === "SASSI_LT"
      ? "Regla SASSI (LT y LT-CR)"
      : "Regla general (LB, LB2, LC, LC2, CC)";

  return {
    condominiumName: report.condominiumName,
    condominiumSlug: report.condominiumSlug,
    projectName: report.projectName ?? "Proyecto principal",
    projectTotalApoles: formatInteger(report.projectTotalApoles),
    projectTotalM2: formatNumber4(report.projectTotalM2),
    projectCommonAreasM2: formatNumber4(report.projectCommonAreasM2),
    totalRegisteredPrivateAreas: formatInteger(report.totalRegisteredPrivateAreas),
    activePrivateAreas: formatInteger(report.activePrivateAreas),
    inactivePrivateAreas: formatInteger(report.inactivePrivateAreas),
    activeParents: formatInteger(report.activeParents),
    activeChildren: formatInteger(report.activeChildren),
    inactiveParents: formatInteger(report.inactiveParents),
    inactiveChildren: formatInteger(report.inactiveChildren),
    areasWithUseType: formatInteger(report.areasWithUseType),
    areasWithoutUseType: formatInteger(report.areasWithoutUseType),
    totalPrivateAreaM2: formatNumber4(report.totalPrivateAreaM2),
    totalApoleAreaM2: formatNumber4(report.totalApoleAreaM2),
    totalBuiltAreaM2: formatNumber4(report.totalBuiltAreaM2),
    totalIndiviso: formatNumber(Math.abs(report.totalIndiviso - 100) < 1 ? 100 : report.totalIndiviso),
    availableAreas: formatInteger(report.availableAreas),
    builtAreas: formatInteger(report.builtAreas),
    parentAreasCount: formatInteger(report.parentAreasCount),
    parentAreasM2: formatNumber4(report.parentAreasM2),
    parentAreasCommonM2: formatNumber4(report.parentAreasCommonM2),
    activeFusionsCount: formatInteger(report.activeFusionsCount),
    classificationBaseTotal: formatInteger(report.classificationBaseTotal),
    classificationBaseLabel: report.classificationBaseLabel,
    classifiedAreas: formatInteger(report.classifiedAreas),
    unclassifiedAreas: formatInteger(report.unclassifiedAreas),
    availableRatio: formatPercent2(report.availableRatio),
    builtRatio: formatPercent2(report.builtRatio),
    availableRatioValue: report.availableRatio,
    builtRatioValue: report.builtRatio,
    classificationModeLabel,
    zones: report.zoneNames,
    rows: report.landUseRows.map((row) => ({
      landUseName: row.landUseName,
      landUseInitials: row.landUseInitials ?? "--",
      total: formatInteger(row.total),
      byZone: report.zoneNames.map((zone) => formatInteger(row.byZone[zone] ?? 0)),
    })),
    totalsByZone: report.zoneNames.map((zone) => formatInteger(report.totalsByZone[zone] ?? 0)),
    grandTotal: formatInteger(report.grandTotal),
    caveats: report.caveats,
    updatedAtLabel: `${new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(report.lastUpdatedAt)}${report.lastUpdatedBy ? ` por ${report.lastUpdatedBy}` : ""}`,
    generatedAtLabel: new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(report.generatedAt),
  };
}
