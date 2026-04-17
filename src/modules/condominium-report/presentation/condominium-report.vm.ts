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
  areasWithUseType: string;
  areasWithoutUseType: string;
  totalPrivateAreaM2: string;
  totalBuiltAreaM2: string;
  totalIndiviso: string;
  availableAreas: string;
  builtAreas: string;
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

function formatPercent(value: number): string {
  return `${value.toLocaleString("es-MX", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
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
    projectTotalM2: formatNumber(report.projectTotalM2),
    projectCommonAreasM2: formatNumber(report.projectCommonAreasM2),
    totalRegisteredPrivateAreas: formatInteger(report.totalRegisteredPrivateAreas),
    activePrivateAreas: formatInteger(report.activePrivateAreas),
    inactivePrivateAreas: formatInteger(report.inactivePrivateAreas),
    areasWithUseType: formatInteger(report.areasWithUseType),
    areasWithoutUseType: formatInteger(report.areasWithoutUseType),
    totalPrivateAreaM2: formatNumber(report.totalPrivateAreaM2),
    totalBuiltAreaM2: formatNumber(report.totalBuiltAreaM2),
    totalIndiviso: formatNumber(report.totalIndiviso),
    availableAreas: formatInteger(report.availableAreas),
    builtAreas: formatInteger(report.builtAreas),
    classificationBaseTotal: formatInteger(report.classificationBaseTotal),
    classificationBaseLabel: report.classificationBaseLabel,
    classifiedAreas: formatInteger(report.classifiedAreas),
    unclassifiedAreas: formatInteger(report.unclassifiedAreas),
    availableRatio: formatPercent(report.availableRatio),
    builtRatio: formatPercent(report.builtRatio),
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
    updatedAtLabel: new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(report.lastUpdatedAt),
    generatedAtLabel: new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(report.generatedAt),
  };
}
