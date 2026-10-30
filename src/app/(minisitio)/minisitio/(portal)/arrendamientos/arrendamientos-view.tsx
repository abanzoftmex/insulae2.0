"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, HandCoins, RefreshCw, Search, Store } from "lucide-react";
import { LoadingSpinner } from "@/components/minisitio/loading-spinner";
import { ViewToggle } from "@/components/minisitio/view-toggle";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import { BannerMetric, PageBanner } from "@/components/minisitio/ui/page-banner";
import { BUTTON, EmptyState, SearchInput } from "@/components/minisitio/ui/list-controls";
import type { ListView } from "@/stores/minisitio.store";
import type { RentalsList } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { ArrendamientosTable } from "./arrendamientos-table";
import { parseNum, type ArrendamientoView } from "./arrendamientos-types";

/** Mis Comercios (antes pages/arrendamientos.js). Los datos llegan del servidor en la primera carga. */
export function ArrendamientosView({ initialData }: { initialData: RentalsList }) {
  const router = useRouter();
  const { user, userType, setArrendamientos } = useMinisitioAuth();
  const arrendamientosData: ArrendamientoView[] = initialData.arrendamientos;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentView, setCurrentView] = useState<ListView>("table");
  const puedeVer = userType === "arrendatario" || userType === "both";

  // Siempre forzar vista de tabla - no guardar preferencia
  // useEffect eliminado para evitar cargar preferencias guardadas en caché

  // Filtrar datos cuando cambie el término de búsqueda
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return arrendamientosData;
    return arrendamientosData.filter(
      (arrendamiento) =>
        arrendamiento.nombre_comercio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.razon_social_comercio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.clase_comercio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.area_privativa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.direccion_area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.contacto_administrativo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.contacto_contable?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.id_arrendamientos?.toString().includes(searchTerm) ||
        arrendamiento.folio_861?.toString().includes(searchTerm),
    );
  }, [searchTerm, arrendamientosData]);

  // Calcular estadísticas financieras
  const stats = useMemo(() => {
    const arrendamientos = arrendamientosData;
    const totalArrendamientos = arrendamientos.length;
    const activos = arrendamientos.filter((a) => a.id_cat_status_comercios === 1).length;
    const conSaldoPendiente = arrendamientos.filter((a) => parseNum(a.saldo_pendiente || 0) > 0).length;

    // Usar los datos calculados específicamente para saldo vencido
    const conSaldoVencido = initialData.saldoVencidoData?.arrendamientosConSaldoVencido || 0;
    const totalSaldoPendiente = arrendamientos.reduce((sum, a) => sum + parseNum(a.saldo_pendiente || 0), 0);
    const totalSaldoVencido = initialData.saldoVencidoData?.totalSaldoVencido || 0;

    // Calcular totales de m² y indiviso
    const totalM2Construccion = arrendamientos.reduce((sum, a) => sum + (parseNum(a.m2_construccion) || 0), 0);
    const totalIndiviso = arrendamientos.reduce((sum, a) => sum + (parseNum(a.indiviso) || 0), 0);
    const totalIndivisoFAP = arrendamientos.reduce((sum, a) => {
      return sum + (a.indiviso_fap_condominio !== null ? parseNum(a.indiviso_fap_condominio) : 0);
    }, 0);

    return {
      total: totalArrendamientos,
      activos,
      conSaldoPendiente,
      conSaldoVencido,
      totalSaldoPendiente,
      totalSaldoVencido,
      totalM2Construccion,
      totalIndiviso,
      totalIndivisoFAP,
    };
  }, [arrendamientosData, initialData.saldoVencidoData]);

  useEffect(() => {
    if (!user) return;

    if (userType !== "arrendatario" && userType !== "both") {
      router.push(msPath("/"));
      return;
    }

    setArrendamientos(arrendamientosData); // Actualizar store
  }, [user, userType, router, setArrendamientos, arrendamientosData]);

  const handleViewChange = (newView: ListView) => {
    setCurrentView(newView);
    // No guardar preferencia - siempre forzar tabla al recargar
  };

  const formatCurrency = (amount: unknown) => {
    const value = parseNum(amount) || 0;
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value);
  };

  // El legacy dejaba el spinner mientras redirigía a quien no tiene comercios
  if (!puedeVer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const alCorriente = Math.max(0, (stats.total || 0) - (stats.conSaldoPendiente || 0));
  const visibles = searchTerm ? filteredData.length : arrendamientosData.length;
  const fechaInicio = (value: string | null | undefined) => {
    if (!value) return "N/A";
    const d = new Date(value);
    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("es-MX");
  };

  return (
    <div className="space-y-6">
      {/* Encabezado con estadísticas */}
      <PageBanner id="comercios-titulo" title="Mis Comercios">
        {/* La primera tarjeta trae desglose y es más alta: las tres alinean su contenido arriba. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 [&>*]:items-start">
          <BannerMetric
            icon={Store}
            tone="gold"
            value={String(stats.total)}
            label="Total Comercios"
            caption={`${stats.activos} activos`}
            details={
              <>
                <span className="flex justify-between gap-2">
                  M² Construcción <span className="font-semibold text-fg tabular-nums">{stats.totalM2Construccion.toFixed(2)} m²</span>
                </span>
                <span className="flex justify-between gap-2">
                  Indiviso Total <span className="font-semibold text-fg tabular-nums">{stats.totalIndiviso.toFixed(4)}%</span>
                </span>
                <span className="flex justify-between gap-2">
                  Indiviso FAP/Cond. <span className="font-semibold text-fg tabular-nums">{stats.totalIndivisoFAP.toFixed(4)}%</span>
                </span>
              </>
            }
          />
          <BannerMetric
            icon={HandCoins}
            tone="overdue"
            valueTone={stats.conSaldoPendiente > 0 ? "overdue" : undefined}
            value={String(stats.conSaldoPendiente)}
            label="Con Saldo Pendiente"
            caption={formatCurrency(stats.totalSaldoPendiente)}
          />
          <BannerMetric icon={CheckCircle2} tone="success" valueTone="success" value={String(alCorriente)} label="Al Corriente" caption="Sin adeudos" />
        </div>
      </PageBanner>

      {/* Buscador */}
      {arrendamientosData.length > 0 && (
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          label="Buscar comercios"
          placeholder="Buscar por ID, nombre comercial, razón social, área privativa, contactos…"
          resultCount={filteredData.length}
        />
      )}

      {/* Control de vista */}
      {arrendamientosData.length > 0 && (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-[18px] font-bold leading-6 tracking-[-0.01em] text-fg">
            <span className="tabular-nums">{visibles}</span> Comercio{visibles !== 1 ? "s" : ""}
            {searchTerm && <span className="ml-1.5 text-[14px] font-medium text-fg-3">encontrado{visibles !== 1 ? "s" : ""}</span>}
          </h2>
          <ViewToggle view={currentView} onViewChange={handleViewChange} />
        </div>
      )}

      {/* Contenido según vista */}
      {Array.isArray(arrendamientosData) && arrendamientosData.length > 0 ? (
        filteredData.length > 0 ? (
          currentView === "grid" ? (
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredData.map((arrendamiento, index) => (
                <li
                  key={arrendamiento?.id_arrendamientos ?? index}
                  className="flex flex-col overflow-hidden rounded-2xl border border-stroke-2 bg-card transition-[border-color,box-shadow] duration-200 ease-out hover:border-stroke hover:shadow-[0_10px_28px_-14px_rgb(61_60_34/0.28)]"
                >
                  <div className="border-b border-stroke-3 px-5 py-4">
                    <h3 className="truncate text-[16px] font-semibold leading-6 text-fg">{arrendamiento?.nombre_comercio || "Sin nombre"}</h3>
                    <p className="truncate text-[13px] text-fg-3">{arrendamiento?.razon_social_comercio || "Sin razón social"}</p>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <Group title="Ubicación">
                      <Row label="Área">{arrendamiento?.area_privativa || "N/A"}</Row>
                      <Row label="Superficie">
                        {arrendamiento?.superficie ? `${parseNum(arrendamiento.superficie).toFixed(2)} m²` : "N/A"}
                      </Row>
                      <Row label="M² Construcción">
                        {arrendamiento?.m2_construccion ? `${parseNum(arrendamiento.m2_construccion).toFixed(2)} m²` : "N/A"}
                      </Row>
                      <Row label="Indiviso">{(parseNum(arrendamiento?.indiviso) || 0).toFixed(4)}%</Row>
                      <Row label="Indiviso FAP/Cond.">
                        {arrendamiento?.indiviso_fap_condominio !== null
                          ? `${parseNum(arrendamiento?.indiviso_fap_condominio).toFixed(4)}%`
                          : "—"}
                      </Row>
                      <Row label="Inicio">{fechaInicio(arrendamiento?.fecha_inicio)}</Row>
                    </Group>

                    <Group title="Contactos">
                      <Row label="Administrativo">{arrendamiento?.contacto_administrativo || "N/A"}</Row>
                      <Row label="Contable">{arrendamiento?.contacto_contable || "N/A"}</Row>
                    </Group>

                    <div className="mt-auto flex gap-2 pt-1">
                      <Link href={msPath(`/arrendamientos/${arrendamiento?.id_arrendamientos}`)} className={`${BUTTON.primary} flex-1`}>
                        Ver Detalle
                      </Link>
                      <Link
                        href={msPath(`/arrendamientos/${arrendamiento?.id_arrendamientos}/estado-cuenta`)}
                        className={`${BUTTON.secondary} flex-1`}
                      >
                        Estado de Cuenta
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ArrendamientosTable arrendamientos={filteredData} />
          )
        ) : (
          <EmptyState
            icon={Search}
            title="No hay resultados con los filtros aplicados"
            description="Ajusta los criterios de búsqueda o limpia los filtros para ver más resultados."
            action={
              <button type="button" onClick={() => setSearchTerm("")} className={BUTTON.primary}>
                Limpiar búsqueda
              </button>
            }
          />
        )
      ) : (
        <EmptyState
          icon={Store}
          title="No tienes arrendamientos registrados"
          description="Cuando tengas arrendamientos activos aparecerán aquí."
          action={
            <button type="button" onClick={() => window.location.reload()} className={BUTTON.primary}>
              <RefreshCw aria-hidden className="h-4 w-4" strokeWidth={2} />
              Actualizar
            </button>
          }
        />
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3.5 ring-1 ring-inset ring-stroke-3">
      <h4 className="mb-2 text-[12px] font-semibold text-fg-3">{title}</h4>
      <dl className="space-y-1.5 text-[13px]">{children}</dl>
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
