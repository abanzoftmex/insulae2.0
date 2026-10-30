"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Building2, CalendarClock, FileText, Loader2, Search, TrendingUp, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/minisitio/status-badge";
import { LoadingSpinner } from "@/components/minisitio/loading-spinner";
import { ViewToggle } from "@/components/minisitio/view-toggle";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import { BannerAside, BannerMetric, PageBanner } from "@/components/minisitio/ui/page-banner";
import { BUTTON, EmptyState, SearchInput } from "@/components/minisitio/ui/list-controls";
import type { ListView } from "@/stores/minisitio.store";
import type { PropertiesList } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import type { ProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { PropiedadesTable } from "./propiedades-table";
import { IndivisoInfo } from "./indiviso-info";
import { generatePropertiesReportPdf } from "./propiedades-report-pdf";
import { tieneReferencia } from "./propiedades-organizer";
import { fechaAyer, parseNum, type PropiedadView } from "./propiedades-format";

/** Mis Propiedades (antes pages/propiedades.js). Los datos llegan del servidor en la primera carga. */
export function PropiedadesView({
  initialData,
  proyecto,
}: {
  initialData: PropertiesList;
  /** null si no se pudo obtener (el legacy seguía con el total de m² por defecto). */
  proyecto: ProjectInfo | null;
}) {
  const router = useRouter();
  const { user, userType, setPropiedades } = useMinisitioAuth();
  const propiedadesData: PropiedadView[] = initialData.propiedades;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentView, setCurrentView] = useState<ListView>("table");
  const totalM2Proyecto = proyecto ? proyecto.totalM2 : 157850.23; // Valor por defecto
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const ultimaActualizacionTexto = initialData.ultimaActualizacionTexto || "No disponible";
  const puedeVer = userType === "propietario" || userType === "both";

  // Siempre forzar vista de tabla - no guardar preferencia
  // useEffect eliminado para evitar cargar preferencias guardadas en caché

  // Filtrar datos aplicando búsqueda (el servidor ya devuelve solo propiedades activas)
  const filteredData = useMemo(() => {
    let filtered = [...propiedadesData];

    // Aplicar filtro de búsqueda por texto
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (propiedad) =>
          propiedad.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          propiedad.iniciales?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          propiedad.zona?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          propiedad.uso_suelo?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  }, [searchTerm, propiedadesData]);

  useEffect(() => {
    if (!user) return;

    if (userType !== "propietario" && userType !== "both") {
      router.push(msPath("/"));
      return;
    }

    setPropiedades(propiedadesData); // Actualizar store
  }, [userType, user, router, setPropiedades, propiedadesData]);

  const handleViewChange = (newView: ListView) => {
    setCurrentView(newView);
    // No guardar preferencia - siempre forzar tabla al recargar
  };

  const clearAllFilters = () => {
    setSearchTerm("");
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  const formatM2 = (m2: unknown) => {
    const value = parseNum(m2) || 0;
    return `${value.toLocaleString("es-MX", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })} m²`;
  };

  const getStatusBadge = (statusId: number) => {
    // Mapear IDs de status a tipos para el badge
    const statusMap: Record<number, number> = {
      1: 1, // Activo -> Verde
      2: 3, // Inactivo -> Rojo
      3: 2, // Pendiente -> Amarillo
    };
    return statusMap[statusId] || 2;
  };

  const getFinancialStatusBadge = (estadoSaldo: string) => {
    // Mapear estado financiero real a badge
    const statusMap: Record<string, number> = {
      vencido: 3, // Rojo
      pendiente: 2, // Amarillo
      a_favor: 1, // Verde
      al_corriente: 1, // Verde
    };
    return statusMap[estadoSaldo] || 2;
  };

  const getPropertyStatusBadge = (statusName: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      Activo: { color: "bg-success-bg text-success ring-success/15", text: "Activo" },
      Inactivo: { color: "bg-critical-bg text-overdue ring-overdue/15", text: "Inactivo" },
      Pendiente: { color: "bg-warning-bg text-warning ring-brand-accent/25", text: "Pendiente" },
      "Sin status": { color: "bg-surface-4 text-fg-3 ring-stroke-2", text: "Sin status" },
    };

    const config = statusMap[statusName] || statusMap["Sin status"];
    return config;
  };

  // Función para generar el reporte PDF de propiedades
  const generatePropertiesReport = async () => {
    if (!filteredData || filteredData.length === 0) {
      alert("No hay propiedades para generar el reporte.");
      return;
    }

    setGeneratingPDF(true);

    try {
      await generatePropertiesReportPdf({ propiedades: filteredData, proyecto, user });
    } catch (error) {
      console.error("Error generando reporte PDF:", error);
      alert("Error al generar el reporte PDF. Por favor, inténtalo de nuevo.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  // El legacy dejaba el spinner mientras redirigía a quien no es propietario
  if (!puedeVer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const activas = filteredData.filter((prop) => prop.id_cat_status === 1); // Solo propiedades activas
  const totalM2 = activas.reduce((total, prop) => {
    const esFAP = tieneReferencia(prop.id_areas_privativas_padre);
    const m2Totales = parseNum(prop.m2_totales) || 0;
    const m2Construccion = parseNum(prop.m2_construccion) || 0;
    // En FAPs el valor principal de superficie viene en m2_construccion.
    const superficie = esFAP ? m2Construccion || m2Totales : m2Totales;
    return total + superficie;
  }, 0);
  const totalIndiviso = activas.reduce(
    (total, prop) => total + (parseNum(prop.indiviso) || 0) + (parseNum(prop.indiviso_fap_condominio) || 0),
    0,
  );
  const totalPendiente = activas.reduce((total, prop) => total + (parseNum(prop.saldo_pendiente) || 0), 0);
  const totalVencido = activas.reduce((total, prop) => total + (parseNum(prop.saldo_vencido) || 0), 0);
  const corte = fechaAyer({ day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Encabezado con estadísticas */}
      <PageBanner
        id="propiedades-titulo"
        title="Mis Propiedades"
        subtitle="Gestiona y monitorea tus propiedades"
        meta={
          <>
            Última actualización: <span className="font-semibold text-white">{ultimaActualizacionTexto}</span>
          </>
        }
        aside={<BannerAside icon={Building2} value={activas.length} label="Propiedades Activas" />}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <BannerMetric icon={TrendingUp} value={`${totalM2.toLocaleString("es-MX")} m²`} label="Metros Cuadrados Totales" />
          <BannerMetric
            icon={BarChart3}
            value={`${totalIndiviso.toFixed(4)}%`}
            label="Indiviso total de las áreas privativas"
            info={<IndivisoInfo totalM2Proyecto={totalM2Proyecto} />}
          />
          <BannerMetric
            icon={Wallet}
            tone="gold"
            value={formatCurrency(totalPendiente)}
            label="Saldo Pendiente"
            caption="Total de cuotas por pagar"
          />
          <BannerMetric
            icon={CalendarClock}
            tone="overdue"
            valueTone={totalVencido > 0 ? "overdue" : undefined}
            value={formatCurrency(totalVencido)}
            label="Saldo Vencido"
            caption={`Al ${corte}`}
          />
        </div>
      </PageBanner>

      {/* Buscador */}
      {propiedadesData.length > 0 && (
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          label="Buscar propiedades"
          placeholder="Buscar por nombre, iniciales, barrio o uso de suelo…"
          resultCount={filteredData.length}
        />
      )}

      {/* Control de vista y acciones */}
      {propiedadesData.length > 0 && (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-[18px] font-bold leading-6 tracking-[-0.01em] text-fg">
            <span className="tabular-nums">{filteredData.length}</span> Propiedad
            {filteredData.length !== 1 ? "es" : ""} Activa
            {filteredData.length !== 1 ? "s" : ""}
            {searchTerm && <span className="ml-1.5 text-[14px] font-medium text-fg-3">(filtrada)</span>}
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={generatePropertiesReport}
              disabled={generatingPDF || filteredData.length === 0}
              className={BUTTON.primary}
            >
              {generatingPDF ? (
                <>
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
                  Generando PDF…
                </>
              ) : (
                <>
                  <FileText aria-hidden className="h-4 w-4" strokeWidth={2} />
                  Generar Reporte PDF
                </>
              )}
            </button>
            <ViewToggle view={currentView} onViewChange={handleViewChange} />
          </div>
        </div>
      )}

      {/* Contenido según vista */}
      {filteredData.length > 0 ? (
        currentView === "grid" ? (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredData.map((propiedad) => {
              const vencido = parseNum(propiedad.saldo_vencido) || 0;
              const status = getPropertyStatusBadge(propiedad.status_nombre);
              return (
                <li
                  key={propiedad.id_areas_privativas}
                  className="flex flex-col rounded-2xl border border-stroke-2 bg-card p-5 transition-[border-color,box-shadow] duration-200 ease-out hover:border-stroke hover:shadow-[0_10px_28px_-14px_rgb(61_60_34/0.28)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[16px] font-semibold leading-6 text-fg">{propiedad.nombre}</h3>
                      {propiedad.iniciales !== propiedad.nombre && (
                        <p className="truncate text-[13px] text-fg-3">{propiedad.iniciales}</p>
                      )}
                    </div>
                    <StatusBadge status={getFinancialStatusBadge(propiedad.estado_saldo)} type="payment" />
                  </div>

                  <dl className="mt-4 space-y-2.5 text-[13.5px]">
                    <Row label="Status">
                      <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium ring-1 ring-inset ${status.color}`}>
                        {status.text}
                      </span>
                    </Row>
                    <Row label="Barrio">{propiedad.zona || "Sin barrio"}</Row>
                    <Row label="Uso de suelo">{propiedad.uso_suelo || "Sin uso definido"}</Row>
                    <Row label="M² Totales">{formatM2(propiedad.m2_totales)}</Row>
                    <Row label="M² Construidos">{formatM2(propiedad.m2_construccion)}</Row>
                    <Row label="Indiviso">{(parseNum(propiedad.indiviso) || 0).toFixed(4)}%</Row>
                    {propiedad.indiviso_fap_condominio !== null && (
                      <Row label="Indiviso FAP/Cond.">{propiedad.indiviso_fap_condominio.toFixed(4)}%</Row>
                    )}
                  </dl>

                  <div
                    className={`mt-4 rounded-xl p-3.5 ring-1 ring-inset ${
                      vencido > 0 ? "bg-critical-bg ring-overdue/15" : "bg-success-bg ring-success/15"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-medium text-fg-2">Saldo Vencido al {corte}</span>
                      <span className={`text-[12px] font-semibold ${vencido > 0 ? "text-overdue" : "text-success"}`}>
                        {vencido > 0 ? "Vencido" : "Al Corriente"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="text-[12.5px] text-fg-3">Total Vencido</span>
                      <span className={`text-[16px] font-bold tabular-nums ${vencido > 0 ? "text-overdue" : "text-success"}`}>
                        {formatCurrency(propiedad.saldo_vencido || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 pt-1">
                    <Link href={msPath(`/propiedades/${propiedad.id_areas_privativas}`)} className={`${BUTTON.primary} flex-1`}>
                      Ver Detalle
                    </Link>
                    <Link
                      href={msPath(`/propiedades/${propiedad.id_areas_privativas}/estado-cuenta`)}
                      className={`${BUTTON.secondary} flex-1`}
                    >
                      Estado de Cuenta
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <PropiedadesTable
            propiedades={filteredData}
            formatCurrency={formatCurrency}
            formatM2={formatM2}
            getStatusBadge={getStatusBadge}
            getFinancialStatusBadge={getFinancialStatusBadge}
          />
        )
      ) : searchTerm ? (
        <EmptyState
          icon={Search}
          title="No se encontraron propiedades"
          description={`No hay propiedades activas que coincidan con «${searchTerm}».`}
          action={
            <button type="button" onClick={clearAllFilters} className={BUTTON.primary}>
              Limpiar búsqueda
            </button>
          }
        />
      ) : (
        <EmptyState
          icon={Building2}
          title="No tienes propiedades asignadas"
          description="Contacta al administrador si crees que esto es un error."
          action={
            <button type="button" onClick={() => window.location.reload()} className={BUTTON.primary}>
              Actualizar
            </button>
          }
        />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-fg-3">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-fg tabular-nums">{children}</dd>
    </div>
  );
}
