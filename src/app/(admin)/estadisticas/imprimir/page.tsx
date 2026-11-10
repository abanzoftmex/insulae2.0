/* eslint-disable @next/next/no-img-element */
import React from "react";
import type { Metadata } from "next";
import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import {
  getStatisticsUseCase,
  toStatisticsVM,
  formatInt,
  formatPct,
} from "@/modules/statistics";
import {
  BusinessLineDonut,
  CompositionDonut,
  HorizontalBars,
  OccupancyMeter,
  OccupancyStackedBars,
  OpeningsChart,
  PaymentsChart,
  ShareBar,
  UseTypeDonut,
  ZoneCategoryHeatmap,
} from "../_components/stats-charts";
import { ChartCard, MiniStat, SectionHeader } from "../_components/section";
import { PrintTrigger } from "./_components/print-trigger";
import { PrintKpiGrid, type PrintKpiItem } from "./_components/print-kpi-grid";
import { Info, Calendar, Filter, MapPin, Building, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Reporte Ejecutivo de Estadísticas | Val'Quirico | Insulae 2.0",
  description: "Exportación oficial en PDF del dashboard de estadísticas de Val'Quirico.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function EstadisticasImprimirPage({ searchParams }: PageProps) {
  await requirePageAccess(MODULES.REPORTE_CONDOMINIO);

  const params = (await searchParams) ?? {};
  const filters = {
    zone: firstParam(params.zona),
    useType: firstParam(params.uso),
  };

  const report = await getStatisticsUseCase.execute(filters);
  if (!report) {
    return (
      <div className="p-8 text-center text-ink-soft bg-white min-h-screen">
        <h1 className="text-xl font-bold text-red-600">Error</h1>
        <p className="mt-2">No se encontró el condominio configurado.</p>
      </div>
    );
  }

  const vm = toStatisticsVM(report);

  const filtersLabel =
    [filters.zone && `Barrio: ${filters.zone}`, filters.useType && `Uso: ${filters.useType}`]
      .filter(Boolean)
      .join(" · ") || "Todo el condominio";

  const kpisData: PrintKpiItem[] = [
    {
      key: "owners",
      label: "Propietarios",
      value: formatInt(vm.totalOwners),
      hint: `${formatInt(vm.ownersWithMultipleAreas)} con más de 1 inmueble`,
      accent: "brand",
    },
    {
      key: "areas",
      label: "Áreas privativas",
      value: formatInt(vm.totalPrivateAreas),
      hint: `${formatInt(vm.parentPrivateAreas)} predios · ${formatInt(vm.childPrivateAreas)} unidades`,
      accent: "cyan",
    },
    {
      key: "businesses",
      label: "Negocios activos",
      value: formatInt(vm.activeBusinesses),
      hint: `${formatInt(vm.totalBusinesses)} registrados en total`,
      accent: "gold",
    },
    {
      key: "occupancy",
      label: "Ocupación",
      value: formatPct(vm.occupancy.rate),
      hint: `${formatInt(vm.occupancy.occupied)} ocupados · ${formatInt(vm.occupancy.unoccupied)} sin ocupar`,
      accent: "lime",
    },
    {
      key: "residential",
      label: "Viviendas",
      value: formatInt(vm.residentialAreas),
      hint: "Lofts, deptos. y casas",
      accent: "plain",
    },
    {
      key: "commercial",
      label: "Locales / servicios",
      value: formatInt(vm.commercialAreas),
      hint: "Incluye hotelería y comercio",
      accent: "plain",
    },
    {
      key: "land",
      label: "Apóles / Suelo",
      value: formatInt(vm.landAreas),
      hint: "Sin unidad construida clasificada",
      accent: "plain",
    },
    {
      key: "built",
      label: "Con construcción",
      value: formatInt(vm.builtAreas),
      hint: `${formatInt(vm.unbuiltAreas)} lotes sin construir`,
      accent: "plain",
    },
  ];

  const totalClassified = vm.areasByCategory.reduce((sum, row) => sum + row.value, 0);
  const emailPct = (vm.contactCoverage.withEmail / Math.max(1, vm.contactCoverage.totalActiveUsers)) * 100;
  const phonePct = (vm.contactCoverage.withPhone / Math.max(1, vm.contactCoverage.totalActiveUsers)) * 100;
  const businessCoverage =
    vm.classifiedBusinesses !== null && vm.activeBusinesses > 0
      ? (vm.classifiedBusinesses / vm.activeBusinesses) * 100
      : null;

  const TOP_USE_TYPES = 6;
  const rankedUseTypes = vm.areasByUseTypeCategorized;
  const useTypeSlices = [
    ...rankedUseTypes.slice(0, TOP_USE_TYPES),
    ...(rankedUseTypes.length > TOP_USE_TYPES
      ? [
          {
            name: "Otros usos",
            value: rankedUseTypes.slice(TOP_USE_TYPES).reduce((sum, row) => sum + row.value, 0),
            category: "Sin clasificar",
          },
        ]
      : []),
  ];

  const peakYear = vm.businessOpeningsByYear.reduce(
    (best, row) => (row.value > (best?.value ?? 0) ? row : best),
    vm.businessOpeningsByYear[0],
  );

  return (
    <div className="bg-[#eef2f5] min-h-screen text-[#1f2937] font-sans antialiased print:bg-white print:p-0">
      {/* ── Client Print Trigger Bar (Hidden on print) ── */}
      <PrintTrigger
        condominiumName={vm.condominiumName}
        filtersLabel={filtersLabel}
      />

      {/* ── Print & PDF Specific Styles ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 landscape;
              margin: 7mm 9mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                font-size: 10px;
                padding: 0 !important;
                margin: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .print-sheet {
                width: 100% !important;
                max-width: 100% !important;
                min-height: auto !important;
                page-break-after: always !important;
                break-after: page !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
              }
              .print-sheet:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
              .avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
            @media screen {
              .print-sheet {
                max-width: 1160px;
                width: 100%;
                margin: 24px auto;
                background: #ffffff;
                box-shadow: 0 4px 28px rgba(0, 0, 0, 0.12);
                border-radius: 12px;
                padding: 24px 28px;
              }
            }
          `,
        }}
      />

      {/* ========================================================================= */}
      {/* ── HOJA 1: Encabezado Ejecutivo, Panorama (KPIs) y Patrimonio Parte 1 ── */}
      {/* ========================================================================= */}
      <div className="print-sheet flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Header Banner Oficial */}
          <header className="relative bg-[#304854] text-white rounded-xl p-5 overflow-hidden shadow-sm border-b-2 border-[#d0b685]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <img
                  src="/brand/valquirico-logo-light.png"
                  alt="Val'Quirico"
                  className="h-11 w-auto object-contain filter drop-shadow"
                />
                <div className="border-l border-white/20 pl-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d0b685]">
                    ADMINISTRADORA VAL'QUIRICO A.C.
                  </p>
                  <h1 className="text-[22px] font-extrabold text-white tracking-tight leading-tight">
                    Reporte Ejecutivo de Estadísticas
                  </h1>
                  <p className="text-[11px] text-white/80 mt-0.5">
                    {vm.condominiumName} · Indicadores integrales de patrimonio, ocupación y actividad económica
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end justify-center text-right shrink-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-[10px] font-bold text-white uppercase tracking-wider mb-1">
                  <Filter className="w-3 h-3 text-[#d0b685]" />
                  <span>{filtersLabel}</span>
                </div>
                <p className="text-[10.5px] font-medium text-white/70 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#d0b685]" />
                  Actualizado: {vm.generatedAtLabel}
                </p>
              </div>
            </div>
          </header>

          {/* Sección 1: Panorama - Indicadores Principales */}
          <section className="space-y-2 avoid-break">
            <SectionHeader
              eyebrow="Panorama"
              title="Indicadores Principales del Condominio"
              description="Métricas consolidadas de propiedad, infraestructura y uso general del suelo."
              accent="#304854"
            />
            <PrintKpiGrid kpis={kpisData} />
          </section>

          {/* Sección 2: Patrimonio (Parte 1: Clasificación y Matriz de Calor) */}
          <section className="space-y-2 avoid-break">
            <SectionHeader
              eyebrow="Patrimonio Inmobiliario"
              title="Composición de las Áreas Privativas"
              description="Distribución por categoría de uso de suelo y concentración por barrio."
              accent="#0891b2"
            />
            <div className="grid grid-cols-5 gap-3.5">
              <div className="col-span-2">
                <ChartCard
                  title="Clasificación de áreas"
                  subtitle="Derivada del uso de suelo registrado"
                  bodyClassName="justify-between gap-2"
                >
                  <CompositionDonut data={vm.areasByCategory} totalLabel="Áreas" />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <MiniStat label="Predios" value={formatInt(vm.parentPrivateAreas)} />
                    <MiniStat label="Unidades" value={formatInt(vm.childPrivateAreas)} />
                    <MiniStat label="Construidos" value={formatInt(vm.builtAreas)} />
                  </div>
                </ChartCard>
              </div>

              <div className="col-span-3">
                <ChartCard
                  title="Barrio × clasificación"
                  subtitle="Dónde se concentra cada tipo de inmueble"
                  hint={`${formatInt(totalClassified)} inmuebles`}
                >
                  <ZoneCategoryHeatmap rows={vm.zoneCategoryMatrix} categories={vm.categoryOrder} />
                </ChartCard>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Hoja 1 */}
        <footer className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
          <span>Val'Quirico · Sistema Condominal Insulae 2.0</span>
          <span>Reporte Ejecutivo Confidencial</span>
          <span>Página 1 de 5</span>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* ── HOJA 2: Patrimonio (Parte 2) y Ocupación Real                       ── */}
      {/* ========================================================================= */}
      <div className="print-sheet flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Header Compacto Hoja 2 */}
          <div className="flex items-center justify-between border-b-2 border-[#304854] pb-2 text-[10.5px]">
            <div className="flex items-center gap-2">
              <img src="/brand/valquirico-logo-light.png" alt="" className="h-5 w-auto object-contain filter invert" />
              <span className="font-extrabold text-[#304854] uppercase tracking-wider">
                Val'Quirico · Estadísticas
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600 font-medium">{filtersLabel}</span>
            </div>
            <span className="text-gray-500 font-medium">Corte al: {vm.generatedAtLabel}</span>
          </div>

          {/* Sección 2 (Cont.): Usos de Suelo y Superficie Construida */}
          <section className="space-y-2 avoid-break">
            <SectionHeader
              eyebrow="Patrimonio Inmobiliario (Cont.)"
              title="Usos de Suelo y Superficie Construida"
              description="Catálogo de usos registrados y metros cuadrados construidos por barrio."
              accent="#0891b2"
            />
            <div className="grid grid-cols-5 gap-3.5">
              <div className="col-span-2">
                <ChartCard
                  title="Usos de suelo"
                  subtitle="Participación sobre el total de inmuebles"
                >
                  <UseTypeDonut data={useTypeSlices} />
                </ChartCard>
              </div>

              <div className="col-span-3">
                <ChartCard
                  title="Superficie construida"
                  subtitle="Metros cuadrados por barrio"
                  hint={`${formatInt(vm.totalBuiltM2)} m² totales`}
                  bodyClassName="justify-between gap-3"
                >
                  <HorizontalBars data={vm.builtM2ByZone} suffix=" m²" labelWidth={118} />
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat
                      label="Promedio construido"
                      value={`${formatInt(vm.builtAreas ? vm.totalBuiltM2 / vm.builtAreas : 0)} m²`}
                      hint="Por inmueble con obra"
                    />
                    <MiniStat
                      label="Concentración"
                      value={
                        vm.builtM2ByZone.length && vm.totalBuiltM2
                          ? formatPct((vm.builtM2ByZone[0].value / vm.totalBuiltM2) * 100, 0)
                          : "—"
                      }
                      hint={vm.builtM2ByZone.length ? `en ${vm.builtM2ByZone[0].name}` : undefined}
                    />
                    <MiniStat
                      label="Barrios con obra"
                      value={formatInt(vm.builtM2ByZone.length)}
                      hint={`de ${formatInt(vm.availableZones.length)} barrios`}
                    />
                  </div>
                </ChartCard>
              </div>
            </div>
          </section>

          {/* Sección 3: Ocupación Real */}
          <section className="space-y-2 avoid-break">
            <SectionHeader
              eyebrow="Ocupación"
              title="Uso Real de los Inmuebles"
              description="Inmuebles considerados ocupados por contar con residente o actividad comercial vigente."
              accent="#d0b685"
            />
            <div className="grid grid-cols-5 gap-3.5">
              <div className="col-span-2">
                <ChartCard title="Ocupación general" bodyClassName="justify-between">
                  <OccupancyMeter
                    rate={vm.occupancy.rate}
                    occupied={vm.occupancy.occupied}
                    unoccupied={vm.occupancy.unoccupied}
                  />
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <MiniStat
                      label="Con negocio"
                      value={formatInt(vm.areasWithActiveBusiness)}
                      hint="Actividad comercial"
                    />
                    <MiniStat
                      label="Con adeudo"
                      value={formatInt(vm.areasWithDebt)}
                      hint="Cargos vigentes"
                    />
                    <MiniStat
                      label="Sin ocupar"
                      value={formatInt(vm.occupancy.unoccupied)}
                      hint="Sin residente ni negocio"
                    />
                    <MiniStat
                      label="Barrios al 100%"
                      value={formatInt(vm.occupancyByZone.filter((z) => z.rate >= 100).length)}
                      hint={`de ${formatInt(vm.occupancyByZone.length)} barrios`}
                    />
                  </div>
                </ChartCard>
              </div>

              <div className="col-span-3">
                <ChartCard
                  title="Ocupación por barrio"
                  subtitle="Proporción ocupada sobre el total de cada barrio"
                >
                  <OccupancyStackedBars rows={vm.occupancyByZone} />
                </ChartCard>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Hoja 2 */}
        <footer className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
          <span>Val'Quirico · Sistema Condominal Insulae 2.0</span>
          <span>Reporte Ejecutivo Confidencial</span>
          <span>Página 2 de 5</span>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* ── HOJA 3: Actividad Económica y Comercio                              ── */}
      {/* ========================================================================= */}
      <div className="print-sheet flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Header Compacto Hoja 3 */}
          <div className="flex items-center justify-between border-b-2 border-[#304854] pb-2 text-[10.5px]">
            <div className="flex items-center gap-2">
              <img src="/brand/valquirico-logo-light.png" alt="" className="h-5 w-auto object-contain filter invert" />
              <span className="font-extrabold text-[#304854] uppercase tracking-wider">
                Val'Quirico · Estadísticas
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600 font-medium">{filtersLabel}</span>
            </div>
            <span className="text-gray-500 font-medium">Corte al: {vm.generatedAtLabel}</span>
          </div>

          {/* Sección 4: Actividad Económica */}
          <section className="space-y-3 avoid-break">
            <SectionHeader
              eyebrow="Actividad Económica"
              title="Negocios y Giros Comerciales"
              description="Composición del comercio interno, giros activos y evolución histórica de aperturas."
              accent="#b5451f"
            />

            <div className="grid grid-cols-2 gap-3.5">
              <ChartCard
                title="Distribución por giro"
                subtitle="Participación sobre negocios clasificados"
                hint={businessCoverage !== null ? `${businessCoverage.toFixed(0)}% clasificados` : undefined}
                bodyClassName="justify-between"
              >
                {vm.businessesByLine && vm.businessesByLine.length > 0 ? (
                  <>
                    <BusinessLineDonut data={vm.businessesByLine} total={vm.classifiedBusinesses ?? 0} />
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <MiniStat label="Giros" value={formatInt(vm.businessLinesCount ?? 0)} hint="En catálogo" />
                      <MiniStat
                        label="Clasificados"
                        value={formatInt(vm.classifiedBusinesses ?? 0)}
                        hint="Con giro activo"
                      />
                      <MiniStat
                        label="Sin giro"
                        value={formatInt(vm.activeBusinesses - (vm.classifiedBusinesses ?? 0))}
                        hint="Por catalogar"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-gray-500 p-4">Catálogo de giros en proceso de migración.</p>
                )}
              </ChartCard>

              <ChartCard
                title="Categorías con mayor presencia"
                subtitle="Las diez categorías con más establecimientos"
              >
                {vm.businessesByCategoryTop && vm.businessesByCategoryTop.length > 0 ? (
                  <HorizontalBars data={vm.businessesByCategoryTop} labelWidth={132} fill />
                ) : (
                  <p className="text-[11px] text-gray-500 p-4">Sin datos de categorías en el filtro actual.</p>
                )}
              </ChartCard>
            </div>

            <div className="grid grid-cols-5 gap-3.5">
              <div className="col-span-3">
                <ChartCard
                  title="Aperturas de negocios por año"
                  subtitle="Altas registradas con fecha de inicio válida"
                  hint={peakYear ? `Año récord: ${peakYear.year}` : undefined}
                >
                  {vm.openingsSeries.length > 0 ? (
                    <OpeningsChart data={vm.openingsSeries} />
                  ) : (
                    <p className="text-[11px] text-gray-500 p-4">Sin aperturas registradas en este periodo.</p>
                  )}
                </ChartCard>
              </div>

              <div className="col-span-2">
                <ChartCard
                  title="Negocios por barrio"
                  subtitle="Sólo arrendamientos vigentes"
                >
                  {vm.businessesByZone.length > 0 ? (
                    <HorizontalBars data={vm.businessesByZone} labelWidth={118} fill />
                  ) : (
                    <p className="text-[11px] text-gray-500 p-4">Sin negocios activos en el filtro actual.</p>
                  )}
                </ChartCard>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Hoja 3 */}
        <footer className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
          <span>Val'Quirico · Sistema Condominal Insulae 2.0</span>
          <span>Reporte Ejecutivo Confidencial</span>
          <span>Página 3 de 5</span>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* ── HOJA 4: Comunidad, Operación y Notas Metodológicas                  ── */}
      {/* ========================================================================= */}
      <div className="print-sheet flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Header Compacto Hoja 4 */}
          <div className="flex items-center justify-between border-b-2 border-[#304854] pb-2 text-[10.5px]">
            <div className="flex items-center gap-2">
              <img src="/brand/valquirico-logo-light.png" alt="" className="h-5 w-auto object-contain filter invert" />
              <span className="font-extrabold text-[#304854] uppercase tracking-wider">
                Val'Quirico · Estadísticas
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600 font-medium">{filtersLabel}</span>
            </div>
            <span className="text-gray-500 font-medium">Corte al: {vm.generatedAtLabel}</span>
          </div>

          {/* Sección 5: Comunidad y Figuras de Propiedad */}
          <section className="space-y-2 avoid-break">
            <SectionHeader
              eyebrow="Comunidad"
              title="Propietarios y Figuras de Propiedad"
              description="Distribución de la propiedad, concentración y localización del padrón."
              accent="#b0509f"
            />
            <div className="grid grid-cols-3 gap-3.5">
              <ChartCard title="Figura de propiedad" subtitle="Asignaciones activas por rol">
                <HorizontalBars data={vm.ownershipByRole} labelWidth={140} fill />
              </ChartCard>

              <ChartCard title="Concentración de propiedad" subtitle="Propietarios según número de inmuebles">
                <HorizontalBars data={vm.ownersByAreaCount} labelWidth={120} useRamp fill />
              </ChartCard>

              <ChartCard
                title="Localización del padrón"
                subtitle="Cobertura de datos de contacto"
                footer={`${formatInt(vm.tenantsCount)} arrendatarios registrados en directorio.`}
              >
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[11px] text-gray-700 font-medium">Con correo electrónico</span>
                      <span className="text-[13px] font-bold text-gray-900 tabular-nums">{formatPct(emailPct, 0)}</span>
                    </div>
                    <ShareBar value={vm.contactCoverage.withEmail} total={vm.contactCoverage.totalActiveUsers} color="#304854" />
                    <p className="text-[9.5px] text-gray-500 mt-0.5">
                      {formatInt(vm.contactCoverage.withEmail)} de {formatInt(vm.contactCoverage.totalActiveUsers)} usuarios activos
                    </p>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[11px] text-gray-700 font-medium">Con teléfono</span>
                      <span className="text-[13px] font-bold text-gray-900 tabular-nums">{formatPct(phonePct, 0)}</span>
                    </div>
                    <ShareBar value={vm.contactCoverage.withPhone} total={vm.contactCoverage.totalActiveUsers} color="#d0b685" />
                    <p className="text-[9.5px] text-gray-500 mt-0.5">
                      {formatInt(vm.contactCoverage.withPhone)} de {formatInt(vm.contactCoverage.totalActiveUsers)} usuarios activos
                    </p>
                  </div>

                  <MiniStat
                    label="Propietarios con > 1 inmueble"
                    value={formatInt(vm.ownersWithMultipleAreas)}
                    hint={`de ${formatInt(vm.totalOwners)} propietarios totales`}
                  />
                </div>
              </ChartCard>
            </div>
          </section>

          {/* Sección 6: Operación, Cobranza y Atención */}
          <section className="space-y-2 avoid-break">
            <SectionHeader
              eyebrow="Operación"
              title="Cobranza y Atención de Tickets"
              description="Actividad financiera recaudada en 24 meses y seguimiento de tickets condominales."
              accent="#2563eb"
            />
            <div className="grid grid-cols-5 gap-3.5">
              <div className="col-span-3">
                <ChartCard
                  title="Cobranza mensual"
                  subtitle="Monto cobrado en los últimos 24 meses (MXN)"
                >
                  <PaymentsChart data={vm.paymentsSeries} />
                </ChartCard>
              </div>

              <div className="col-span-2">
                <ChartCard title="Medios de pago y Tickets" subtitle="Distribución por método y estatus">
                  <HorizontalBars data={vm.paymentsByMethod} labelWidth={112} />
                  {vm.ticketsByStatus.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-gray-200">
                      <p className="text-[9.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Tickets de atención ({formatInt(vm.totalTickets)} totales)
                      </p>
                      <ul className="space-y-1 text-[11px]">
                        {vm.ticketsByStatus.map((row) => (
                          <li key={row.name} className="flex items-center justify-between">
                            <span className="text-gray-700 font-medium">{row.name}</span>
                            <span className="text-gray-900 tabular-nums font-bold">{formatInt(row.value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ChartCard>
              </div>
            </div>
          </section>

          {/* Sección 7: Notas Metodológicas */}
          {vm.caveats.length > 0 && (
            <div className="rounded-lg border border-[#d0b685]/40 bg-[#faf8f3] p-3 text-[10px] avoid-break">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#8a6e3e] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#8a6e3e] uppercase tracking-wider mb-1">
                    Criterios y Notas Metodológicas
                  </p>
                  <ul className="space-y-0.5 text-gray-700 list-disc pl-3.5 leading-snug">
                    {vm.caveats.map((caveat, idx) => (
                      <li key={idx}>{caveat}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Hoja 4 */}
        <footer className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
          <span>Val'Quirico · Sistema Condominal Insulae 2.0</span>
          <span>Reporte Ejecutivo Confidencial</span>
          <span>Página 4 de 5</span>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* ── HOJA 5: Desgloses Tabulares Ejecutivos                              ── */}
      {/* ========================================================================= */}
      <div className="print-sheet flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Header Compacto Hoja 5 */}
          <div className="flex items-center justify-between border-b-2 border-[#304854] pb-2 text-[10.5px]">
            <div className="flex items-center gap-2">
              <img src="/brand/valquirico-logo-light.png" alt="" className="h-5 w-auto object-contain filter invert" />
              <span className="font-extrabold text-[#304854] uppercase tracking-wider">
                Val'Quirico · Estadísticas
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600 font-medium">{filtersLabel}</span>
            </div>
            <span className="text-gray-500 font-medium">Corte al: {vm.generatedAtLabel}</span>
          </div>

          <section className="space-y-3">
            <SectionHeader
              eyebrow="Desgloses Detallados"
              title="Tablas Ejecutivas de Respaldo"
              description="Registros detallados de cobranza mensual, clasificación de negocios y usos de suelo."
              accent="#304854"
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Tabla 1: Histórico de Cobranza Mensual */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-[#304854] text-white px-3.5 py-2 font-bold text-[11px] uppercase tracking-wider flex justify-between items-center">
                  <span>Cobranza Mensual Recaudada</span>
                  <span className="text-[#d0b685] text-[10px]">Últimos 24 meses</span>
                </div>
                <div className="max-h-[560px] overflow-hidden">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[9px]">
                      <tr>
                        <th className="py-1.5 px-3">Periodo (Mes)</th>
                        <th className="py-1.5 px-3 text-right">No. Pagos</th>
                        <th className="py-1.5 px-3 text-right">Monto Recaudado (MXN)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vm.paymentsByMonth.slice(-16).map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="py-1 px-3 font-medium text-gray-800">{item.month}</td>
                          <td className="py-1 px-3 text-right font-semibold text-gray-700">{formatInt(item.count)}</td>
                          <td className="py-1 px-3 text-right font-bold text-[#304854]">
                            ${formatInt(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Columna Derecha: Giros Comerciales y Usos de Suelo */}
              <div className="space-y-4">
                {/* Tabla 2: Giros Comerciales */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="bg-[#304854] text-white px-3.5 py-2 font-bold text-[11px] uppercase tracking-wider flex justify-between items-center">
                    <span>Negocios por Giro Comercial</span>
                    <span className="text-[#d0b685] text-[10px]">{formatInt(vm.activeBusinesses)} activos</span>
                  </div>
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[9px]">
                      <tr>
                        <th className="py-1.5 px-3">Giro</th>
                        <th className="py-1.5 px-3 text-right">Establecimientos</th>
                        <th className="py-1.5 px-3 text-right">Participación %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(vm.businessesByLine ?? []).slice(0, 8).map((line, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="py-1 px-3 font-medium text-gray-800">{line.name}</td>
                          <td className="py-1 px-3 text-right font-semibold text-gray-700">{formatInt(line.businesses)}</td>
                          <td className="py-1 px-3 text-right font-bold text-[#304854]">
                            {line.share.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tabla 3: Usos de Suelo Destacados */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="bg-[#304854] text-white px-3.5 py-2 font-bold text-[11px] uppercase tracking-wider flex justify-between items-center">
                    <span>Principales Usos de Suelo</span>
                    <span className="text-[#d0b685] text-[10px]">{formatInt(vm.totalPrivateAreas)} predios</span>
                  </div>
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[9px]">
                      <tr>
                        <th className="py-1.5 px-3">Uso de Suelo</th>
                        <th className="py-1.5 px-3 text-right">Inmuebles</th>
                        <th className="py-1.5 px-3 text-right">% del Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vm.areasByUseType.slice(0, 8).map((use, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="py-1 px-3 font-medium text-gray-800">{use.name}</td>
                          <td className="py-1 px-3 text-right font-semibold text-gray-700">{formatInt(use.value)}</td>
                          <td className="py-1 px-3 text-right font-bold text-[#304854]">
                            {vm.totalPrivateAreas > 0 ? ((use.value / vm.totalPrivateAreas) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Hoja 5 */}
        <footer className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
          <span>Val'Quirico · Sistema Condominal Insulae 2.0</span>
          <span>Reporte Ejecutivo Confidencial</span>
          <span>Página 5 de 5</span>
        </footer>
      </div>
    </div>
  );
}

