import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import type { Metadata } from "next";
import { Info } from "lucide-react";

import { getStatisticsUseCase, toStatisticsVM, formatInt, formatPct } from "@/modules/statistics";
import { PageBackBadge } from "@/components/ui/page-back-badge";
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
} from "./_components/stats-charts";
import { ChartCard, MiniStat, SectionHeader } from "./_components/section";
import { SectionNav, type SectionLink } from "./_components/section-nav";
import { StatsFilters } from "./_components/stats-filters";
import { ExportButtons, type StatisticsExportPayload } from "./_components/export-buttons";
import { KpiGrid, type KpiCardData } from "./_components/kpi-grid";

export const metadata: Metadata = {
  title: "Estadísticas | Insulae 2.0",
  description: "Dashboard de indicadores del condominio: propietarios, inmuebles, ocupación y actividad económica.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function EstadisticasPage({ searchParams }: PageProps) {
  await requirePageAccess(MODULES.REPORTE_CONDOMINIO);

  const params = (await searchParams) ?? {};
  const filters = {
    zone: firstParam(params.zona),
    useType: firstParam(params.uso),
  };

  const report = await getStatisticsUseCase.execute(filters);
  if (!report) {
    return (
      <div className="p-6">
        <p className="text-ink-soft">No se encontró el condominio configurado.</p>
      </div>
    );
  }
  const vm = toStatisticsVM(report);

  const filtersLabel =
    [filters.zone && `Barrio: ${filters.zone}`, filters.useType && `Uso: ${filters.useType}`]
      .filter(Boolean)
      .join(" · ") || "Todo el condominio";

  const kpiCards: KpiCardData[] = [
    {
      key: "owners",
      label: "Propietarios",
      value: formatInt(vm.totalOwners),
      hint: `${formatInt(vm.ownersWithMultipleAreas)} con más de 1 inmueble`,
      accent: "brand",
    },
    {
      key: "areas",
      label: "Inmuebles activos",
      value: formatInt(vm.totalPrivateAreas),
      hint: `${formatInt(vm.parentPrivateAreas)} predios · ${formatInt(vm.childPrivateAreas)} unidades`,
      accent: "cyan",
    },
    {
      key: "businesses",
      label: "Negocios activos",
      value: formatInt(vm.activeBusinesses),
      hint: `${formatInt(vm.totalBusinesses)} registrados`,
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
    },
    {
      key: "commercial",
      label: "Locales y servicios",
      value: formatInt(vm.commercialAreas),
      hint: "Incluye hotelería",
    },
    {
      key: "land",
      label: "Lotes / suelo",
      value: formatInt(vm.landAreas),
      hint: "Sin unidad construida clasificada",
    },
    {
      key: "built",
      label: "Con construcción",
      value: formatInt(vm.builtAreas),
      hint: `${formatInt(vm.unbuiltAreas)} sin construir`,
    },
  ];

  const exportPayload: StatisticsExportPayload = {
    condominiumName: vm.condominiumName,
    generatedAtLabel: vm.generatedAtLabel,
    filtersLabel,
    kpis: vm.kpis,
    sheets: [
      {
        name: "Negocios por giro",
        rows: (vm.businessesByLine ?? []).map((row) => ({
          Giro: row.name,
          Negocios: row.businesses,
          "Participación %": Number(row.share.toFixed(1)),
        })),
      },
      {
        name: "Categorías comerciales",
        rows: (vm.businessesByCategoryTop ?? []).map((row) => ({ Categoría: row.name, Negocios: row.value })),
      },
      {
        name: "Negocios por barrio",
        rows: vm.businessesByZone.map((row) => ({ Barrio: row.name, "Negocios activos": row.value })),
      },
      {
        name: "Aperturas por año",
        rows: vm.businessOpeningsByYear.map((row) => ({ Año: row.year, Aperturas: row.value })),
      },
      {
        name: "Inmuebles por barrio",
        rows: vm.areasByZone.map((row) => ({ Barrio: row.name, Inmuebles: row.value })),
      },
      {
        name: "Usos de suelo",
        rows: vm.areasByUseType.map((row) => ({ "Uso de suelo": row.name, Inmuebles: row.value })),
      },
      {
        name: "Clasificación",
        rows: vm.areasByCategory.map((row) => ({ Categoría: row.name, Inmuebles: row.value })),
      },
      {
        name: "Tipos de propiedad",
        rows: vm.ownershipByRole.map((row) => ({ Rol: row.name, Asignaciones: row.value })),
      },
      {
        name: "Propietarios por inmuebles",
        rows: vm.ownersByAreaCount.map((row) => ({ Rango: row.name, Propietarios: row.value })),
      },
      {
        name: "Pagos por mes",
        rows: vm.paymentsByMonth.map((row) => ({ Mes: row.month, Pagos: row.count, "Monto MXN": row.amount })),
      },
      {
        name: "Pagos por método",
        rows: vm.paymentsByMethod.map((row) => ({ Método: row.name, Pagos: row.value })),
      },
      {
        name: "Tickets",
        rows: vm.ticketsByStatus.map((row) => ({ Estado: row.name, Tickets: row.value })),
      },
    ],
    caveats: vm.caveats,
  };


  const totalClassified = vm.areasByCategory.reduce((sum, row) => sum + row.value, 0);
  const emailPct = (vm.contactCoverage.withEmail / Math.max(1, vm.contactCoverage.totalActiveUsers)) * 100;
  const phonePct = (vm.contactCoverage.withPhone / Math.max(1, vm.contactCoverage.totalActiveUsers)) * 100;
  const businessCoverage =
    vm.classifiedBusinesses !== null && vm.activeBusinesses > 0
      ? (vm.classifiedBusinesses / vm.activeBusinesses) * 100
      : null;
  // La dona admite ~7 clases de color: los seis usos mayores y el resto agrupado
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

  const sections: SectionLink[] = [
    { id: "panorama", label: "Panorama", accent: "#5d5b35" },
    { id: "patrimonio", label: "Patrimonio", accent: "#0891b2" },
    { id: "ocupacion", label: "Ocupación", accent: "#b8860b" },
    { id: "economia", label: "Actividad económica", accent: "#b5451f" },
    { id: "comunidad", label: "Comunidad", accent: "#b0509f" },
    { id: "operacion", label: "Operación", accent: "#2563eb" },
  ];

  const peakYear = vm.businessOpeningsByYear.reduce(
    (best, row) => (row.value > (best?.value ?? 0) ? row : best),
    vm.businessOpeningsByYear[0],
  );

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-10 -my-4 md:-my-6 lg:-my-8 px-4 md:px-6 lg:px-10 py-4 md:py-6 lg:py-8 bg-[#faf9f6] min-h-screen">
      <div className="space-y-7">
        {/* ── Encabezado ─────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <PageBackBadge className="mt-2 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-accent mb-1">
                {vm.condominiumName}
              </p>
              <h1 className="text-[26px] font-bold text-ink leading-none tracking-tight">Estadísticas</h1>
              <p className="text-[12px] text-ink-soft mt-1.5">
                {filtersLabel} · Actualizado {vm.generatedAtLabel}
              </p>
            </div>
          </div>
          <ExportButtons payload={exportPayload} />
        </header>

        {/* ── Navegación + filtros (siempre visibles) ────────────────── */}
        <div className="sticky top-0 z-30 -mx-1 px-1 py-2 bg-[#faf9f6]/92 backdrop-blur-sm">
          <div className="bg-card rounded-card border border-line/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-3 py-2 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 min-w-0">
            <SectionNav sections={sections} />
            <div className="lg:ml-auto lg:border-l lg:border-line lg:pl-3 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <StatsFilters
                zones={vm.availableZones}
                useTypes={vm.availableUseTypes}
                currentZone={filters.zone}
                currentUseType={filters.useType}
              />
            </div>
          </div>
        </div>

        {/* ── Indicadores principales ────────────────────────────────── */}
        <section id="panorama" className="space-y-3 scroll-mt-24">
          <SectionHeader
            eyebrow="Panorama"
            title="Indicadores principales"
            description="Toca cualquier tarjeta para abrir su detalle completo con estadísticas y tabla."
            accent="#5d5b35"
          />
          <KpiGrid kpis={kpiCards} filters={filters} />
        </section>

        {/* ── Patrimonio inmobiliario ────────────────────────────────── */}
        <section id="patrimonio" className="space-y-3 scroll-mt-24">
          <SectionHeader
            eyebrow="Patrimonio"
            title="Composición del inmobiliario"
            description="Cómo se reparten los inmuebles entre barrios, clasificaciones y usos de suelo."
            accent="#0891b2"
          />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard
              title="Clasificación de inmuebles"
              subtitle="Derivada del uso de suelo registrado"
              className="lg:col-span-2"
              bodyClassName="justify-between gap-4"
            >
              <CompositionDonut data={vm.areasByCategory} totalLabel="inmuebles" />
              <div className="grid grid-cols-3 gap-2.5">
                <MiniStat label="Predios" value={formatInt(vm.parentPrivateAreas)} />
                <MiniStat label="Unidades" value={formatInt(vm.childPrivateAreas)} />
                <MiniStat label="Construidos" value={formatInt(vm.builtAreas)} />
              </div>
            </ChartCard>
            <ChartCard
              title="Barrio × clasificación"
              subtitle="Dónde se concentra cada tipo de inmueble"
              hint={`${formatInt(totalClassified)} inmuebles`}
              className="lg:col-span-3"
            >
              <ZoneCategoryHeatmap rows={vm.zoneCategoryMatrix} categories={vm.categoryOrder} />
            </ChartCard>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard
              title="Usos de suelo"
              subtitle="Participación de cada uso sobre el total de inmuebles"
              className="lg:col-span-2"
            >
              <UseTypeDonut data={useTypeSlices} />
            </ChartCard>
            <ChartCard
              title="Superficie construida"
              subtitle="Metros cuadrados por barrio"
              hint={`${formatInt(vm.totalBuiltM2)} m² totales`}
              className="lg:col-span-3"
              bodyClassName="justify-between gap-4"
            >
              <HorizontalBars data={vm.builtM2ByZone} suffix=" m²" labelWidth={118} />
              <div className="grid grid-cols-3 gap-2.5">
                <MiniStat
                  label="Promedio construido"
                  value={`${formatInt(vm.builtAreas ? vm.totalBuiltM2 / vm.builtAreas : 0)} m²`}
                  hint="Por inmueble con construcción"
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
        </section>

        {/* ── Ocupación ──────────────────────────────────────────────── */}
        <section id="ocupacion" className="space-y-3 scroll-mt-24">
          <SectionHeader
            eyebrow="Ocupación"
            title="Uso real de los inmuebles"
            description="Un inmueble cuenta como ocupado cuando tiene residente asignado o un negocio activo."
            accent="#b8860b"
          />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard title="Ocupación general" className="lg:col-span-2" bodyClassName="justify-between">
              <OccupancyMeter
                rate={vm.occupancy.rate}
                occupied={vm.occupancy.occupied}
                unoccupied={vm.occupancy.unoccupied}
              />
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <MiniStat
                  label="Con negocio"
                  value={formatInt(vm.areasWithActiveBusiness)}
                  hint="Inmuebles con actividad comercial"
                />
                <MiniStat label="Con adeudo" value={formatInt(vm.areasWithDebt)} hint="Cargos abiertos o parciales" />
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
            <ChartCard
              title="Ocupación por barrio"
              subtitle="Proporción ocupada sobre el total de cada barrio"
              className="lg:col-span-3"
            >
              <OccupancyStackedBars rows={vm.occupancyByZone} />
            </ChartCard>
          </div>
        </section>

        {/* ── Actividad económica ────────────────────────────────────── */}
        <section id="economia" className="space-y-3 scroll-mt-24">
          <SectionHeader
            eyebrow="Actividad económica"
            title="Negocios y giros comerciales"
            description="Composición del comercio dentro del condominio y su evolución."
            accent="#b5451f"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Distribución por giro"
              subtitle="Participación de cada giro sobre los negocios clasificados"
              hint={businessCoverage !== null ? `${businessCoverage.toFixed(0)}% clasificados` : undefined}
              bodyClassName="justify-between"
            >
              {vm.businessesByLine && vm.businessesByLine.length > 0 ? (
                <>
                  <BusinessLineDonut data={vm.businessesByLine} total={vm.classifiedBusinesses ?? 0} />
                  <div className="grid grid-cols-3 gap-2.5 mt-4">
                    <MiniStat label="Giros" value={formatInt(vm.businessLinesCount ?? 0)} hint="En el catálogo" />
                    <MiniStat
                      label="Clasificados"
                      value={formatInt(vm.classifiedBusinesses ?? 0)}
                      hint="Negocios con giro"
                    />
                    <MiniStat
                      label="Sin giro"
                      value={formatInt(vm.activeBusinesses - (vm.classifiedBusinesses ?? 0))}
                      hint="Pendientes de capturar"
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 text-[12px] text-ink-soft bg-canvas-2 rounded-lg p-4">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand" />
                  <p>
                    El catálogo de giros aún no está migrado. Ejecuta{" "}
                    <code className="font-mono text-[11px]">npm run migration:backfill-business-lines</code>.
                  </p>
                </div>
              )}
            </ChartCard>
            <ChartCard title="Categorías con mayor presencia" subtitle="Las diez con más establecimientos">
              {vm.businessesByCategoryTop && vm.businessesByCategoryTop.length > 0 ? (
                <HorizontalBars data={vm.businessesByCategoryTop} labelWidth={132} fill />
              ) : (
                <p className="text-[12px] text-ink-soft">Disponible al migrar el catálogo de giros.</p>
              )}
            </ChartCard>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard
              title="Aperturas de negocios por año"
              subtitle="Altas registradas con fecha de inicio válida"
              hint={peakYear ? `Pico en ${peakYear.year}` : undefined}
              className="lg:col-span-3"
            >
              {vm.openingsSeries.length > 0 ? (
                <OpeningsChart data={vm.openingsSeries} />
              ) : (
                <p className="text-[12px] text-ink-soft">Sin datos de aperturas en el filtro actual.</p>
              )}
            </ChartCard>
            <ChartCard
              title="Negocios por barrio"
              subtitle="Sólo arrendamientos vigentes"
              className="lg:col-span-2"
            >
              {vm.businessesByZone.length > 0 ? (
                <HorizontalBars data={vm.businessesByZone} labelWidth={118} fill />
              ) : (
                <p className="text-[12px] text-ink-soft">Sin negocios activos en el filtro actual.</p>
              )}
            </ChartCard>
          </div>
        </section>

        {/* ── Comunidad ──────────────────────────────────────────────── */}
        <section id="comunidad" className="space-y-3 scroll-mt-24">
          <SectionHeader
            eyebrow="Comunidad"
            title="Propietarios y figuras de propiedad"
            description="Cómo se distribuye la propiedad y qué tan localizable es el padrón."
            accent="#b0509f"
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Figura de propiedad" subtitle="Asignaciones activas por rol">
              <HorizontalBars data={vm.ownershipByRole} labelWidth={148} fill />
            </ChartCard>
            <ChartCard title="Concentración de propiedad" subtitle="Propietarios según cuántos inmuebles tienen">
              <HorizontalBars data={vm.ownersByAreaCount} labelWidth={126} useRamp fill />
            </ChartCard>
            <ChartCard
              title="Localización del padrón"
              subtitle="Cobertura de datos de contacto"
              footer={`${formatInt(vm.tenantsCount)} arrendatarios registrados en el directorio.`}
            >
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[12px] text-ink font-medium">Con correo</span>
                    <span className="text-[15px] font-bold text-ink tabular-nums">{formatPct(emailPct, 0)}</span>
                  </div>
                  <ShareBar value={vm.contactCoverage.withEmail} total={vm.contactCoverage.totalActiveUsers} />
                  <p className="text-[10.5px] text-ink-soft/75 mt-1">
                    {formatInt(vm.contactCoverage.withEmail)} de {formatInt(vm.contactCoverage.totalActiveUsers)}{" "}
                    usuarios activos
                  </p>
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[12px] text-ink font-medium">Con teléfono</span>
                    <span className="text-[15px] font-bold text-ink tabular-nums">{formatPct(phonePct, 0)}</span>
                  </div>
                  <ShareBar
                    value={vm.contactCoverage.withPhone}
                    total={vm.contactCoverage.totalActiveUsers}
                    color="#b8860b"
                  />
                  <p className="text-[10.5px] text-ink-soft/75 mt-1">
                    {formatInt(vm.contactCoverage.withPhone)} de {formatInt(vm.contactCoverage.totalActiveUsers)}{" "}
                    usuarios activos
                  </p>
                </div>
                <MiniStat
                  label="Propietarios con más de un inmueble"
                  value={formatInt(vm.ownersWithMultipleAreas)}
                  hint={`de ${formatInt(vm.totalOwners)} propietarios`}
                />
              </div>
            </ChartCard>
          </div>
        </section>

        {/* ── Operación ──────────────────────────────────────────────── */}
        <section id="operacion" className="space-y-3 scroll-mt-24">
          <SectionHeader
            eyebrow="Operación"
            title="Cobranza y atención"
            description="Actividad de pagos registrada y estado de los tickets."
            accent="#2563eb"
          />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard
              title="Cobranza mensual"
              subtitle="Monto cobrado en los últimos 24 meses"
              className="lg:col-span-3"
            >
              <PaymentsChart data={vm.paymentsSeries} />
            </ChartCard>
            <ChartCard title="Medios de pago" subtitle="Distribución de pagos registrados" className="lg:col-span-2">
              <HorizontalBars data={vm.paymentsByMethod} labelWidth={112} />
              {vm.ticketsByStatus.length > 0 && (
                <div className="mt-4 pt-3 border-t border-line">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70 mb-2">
                    Tickets de atención ({formatInt(vm.totalTickets)})
                  </p>
                  <ul className="space-y-1.5 text-[12px]">
                    {vm.ticketsByStatus.map((row) => (
                      <li key={row.name} className="flex items-center justify-between">
                        <span className="text-ink">{row.name}</span>
                        <span className="text-ink-soft tabular-nums font-semibold">{formatInt(row.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ChartCard>
          </div>
        </section>

        {/* ── Notas ──────────────────────────────────────────────────── */}
        {vm.caveats.length > 0 && (
          <section className="rounded-card border border-gold/25 bg-gold-soft px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-accent" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft/80 mb-1.5">
                  Cómo leer estas cifras
                </p>
                <ul className="space-y-1 text-[11.5px] text-ink-soft list-disc pl-4 leading-relaxed">
                  {vm.caveats.map((caveat) => (
                    <li key={caveat}>{caveat}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
