"use client";

/** Panel de Control (antes pages/dashboard.js). Los datos llegan cargados desde page.tsx. */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, DollarSign, Home, TrendingUp, Building2 } from "lucide-react";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioStore } from "@/stores/minisitio.store";
import type { DashboardSummary } from "@/modules/minisitio/infrastructure/queries/dashboard.queries";
import type { RentalsList } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { useDisplayTimeZone, useHydrated } from "../_lib/client-dates";

type DashboardData = Pick<
  DashboardSummary,
  | "notificaciones"
  | "totalNotificaciones"
  | "saldoPendiente"
  | "saldoVencido"
  | "saldoAFavor"
  | "totalM2"
  | "totalIndiviso"
  | "totalPropiedades"
  | "totalArrendamientos"
  | "propiedadesConSaldo"
  | "propiedadesSinSaldo"
  | "totalSaldoVencidoPropiedades"
>;

// Datos por defecto si el resumen no se pudo cargar (igual que el catch del minisitio).
const EMPTY_DASHBOARD_DATA: DashboardData = {
  notificaciones: [],
  totalNotificaciones: 0,
  saldoPendiente: 0,
  saldoVencido: 0,
  saldoAFavor: 0,
  totalM2: 0,
  totalIndiviso: 0,
  totalPropiedades: 0,
  totalArrendamientos: 0,
  propiedadesConSaldo: 0,
  propiedadesSinSaldo: 0,
  totalSaldoVencidoPropiedades: 0,
};

interface ComerciosData {
  totalComercios: number;
  comerciosActivos: number;
  conSaldoPendiente: number;
  conSaldoVencido: number;
  totalSaldoPendiente: number;
  totalSaldoVencido: number;
  totalM2: number;
  totalIndiviso: number;
}

const EMPTY_COMERCIOS_DATA: ComerciosData = {
  totalComercios: 0,
  comerciosActivos: 0,
  conSaldoPendiente: 0,
  conSaldoVencido: 0,
  totalSaldoPendiente: 0,
  totalSaldoVencido: 0,
  totalM2: 0,
  totalIndiviso: 0,
};

/** Totales de comercios, calculados igual que en el minisitio a partir de /api/arrendamientos. */
function computeComerciosData(data: RentalsList): ComerciosData {
  const arrendamientos = data.arrendamientos;
  const totalComercios = arrendamientos.length;
  const comerciosActivos = arrendamientos.filter(
    (a) => a.id_cat_status_comercios === 1
  ).length;
  const conSaldoPendiente = arrendamientos.filter(
    (a) => Number(a.saldo_pendiente || 0) > 0
  ).length;
  const conSaldoVencido =
    data.saldoVencidoData?.arrendamientosConSaldoVencido || 0;
  const totalSaldoPendiente = arrendamientos.reduce(
    (sum, a) => sum + Number(a.saldo_pendiente || 0),
    0
  );
  const totalSaldoVencido = data.saldoVencidoData?.totalSaldoVencido || 0;
  const totalM2 = arrendamientos.reduce(
    (sum, a) => sum + Number(a.superficie || 0),
    0
  );
  const totalIndiviso = arrendamientos.reduce(
    (sum, a) => sum + Number(a.indiviso || 0),
    0
  );

  return {
    totalComercios,
    comerciosActivos,
    conSaldoPendiente,
    conSaldoVencido,
    totalSaldoPendiente,
    totalSaldoVencido,
    totalM2,
    totalIndiviso,
  };
}

export function DashboardView({
  summary,
  rentals,
}: {
  /** `null` si el resumen no se pudo cargar. */
  summary: DashboardSummary | null;
  /** `null` si los arrendamientos no se pudieron cargar. */
  rentals: RentalsList | null;
}) {
  const router = useRouter();
  const {
    user,
    userType,
    updateDashboardData,
    hasPropiedades,
    hasComerciosArrendamientos,
  } = useMinisitioAuth();
  const timeZone = useDisplayTimeZone();
  // Hasta hidratar, números con el formato del servidor (es-MX); después, el del navegador como antes.
  const numberLocale = useHydrated() ? undefined : "es-MX";

  const dashboardData = summary ?? EMPTY_DASHBOARD_DATA;

  // Datos de comercios solo si el usuario es arrendatario (mismas condiciones que el minisitio)
  const comerciosData =
    rentals &&
    (userType === "arrendatario" || userType === "both") &&
    hasComerciosArrendamientos
      ? computeComerciosData(rentals)
      : EMPTY_COMERCIOS_DATA;

  useEffect(() => {
    if (!user) return;

    if (!user?.aceptoAvisoPrivacidad) {
      router.push(msPath("/privacy"));
      return;
    }

    if (!summary) return;

    // Actualizar el store con los datos obtenidos. Se espera a que el shell rehidrate el
    // store: una escritura antes pisaría en sessionStorage las preferencias guardadas.
    const { persist } = useMinisitioStore;
    if (persist.hasHydrated()) {
      updateDashboardData(summary);
      return;
    }
    const unsubscribe = persist.onFinishHydration(() => {
      unsubscribe();
      updateDashboardData(summary);
    });
    return unsubscribe;
  }, [user, router, updateDashboardData, summary]);

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(parseFloat(String(amount)) || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header de bienvenida */}
      <div className="bg-primary-dark rounded-xl p-4 md:p-5 lg:p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Panel de Control</h1>
            <p className="text-gray-300 mt-1" suppressHydrationWarning>
              Resumen general de tu cuenta -{" "}
              {new Date().toLocaleDateString("es-MX", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone,
              })}
            </p>
          </div>
          <div className="flex items-center bg-primary-light bg-opacity-20 rounded-lg p-3">
            <User className="w-8 h-8 text-primary-light mr-3" />
            <div>
              <p className="text-sm font-medium">
                {userType === "both"
                  ? "Propietario y Comercio"
                  : userType === "propietario"
                    ? "Propietario"
                    : "Comercio"}
              </p>
              <p className="text-xs text-gray-700">Tipo de usuario</p>
            </div>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-start">
              <div className="bg-primary-light rounded-lg p-3 mr-4 flex-shrink-0">
                <DollarSign className="w-6 h-6 text-primary-dark" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg md:text-xl font-bold text-gray-700">
                  {formatCurrency(dashboardData.saldoVencido)}
                </p>
                <p className="text-sm text-gray-700">Saldo Pendiente</p>
              </div>
            </div>
          </div>

          {(userType === "propietario" || userType === "both") &&
            hasPropiedades && (
              <button
                onClick={() => router.push(msPath("/propiedades"))}
                className="bg-white bg-opacity-10 rounded-lg p-4 hover:bg-opacity-20 transition-all duration-200 cursor-pointer w-full text-left"
              >
                <div className="flex items-start">
                  <div className="bg-blue-500 rounded-lg p-3 mr-4 flex-shrink-0">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-bold text-gray-700">
                      {dashboardData.totalPropiedades}
                    </p>
                    <p className="text-sm text-gray-700">Propiedades</p>
                  </div>
                </div>
              </button>
            )}

          {(userType === "arrendatario" || userType === "both") &&
            hasComerciosArrendamientos && (
              <button
                onClick={() => router.push(msPath("/arrendamientos"))}
                className="bg-white bg-opacity-10 rounded-lg p-4 hover:bg-opacity-20 transition-all duration-200 cursor-pointer w-full text-left"
              >
                <div className="flex items-start">
                  <div className="bg-green-500 rounded-lg p-3 mr-4 flex-shrink-0">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-bold text-gray-700">
                      {dashboardData.totalArrendamientos}
                    </p>
                    <p className="text-sm text-gray-700">Comercios</p>
                  </div>
                </div>
              </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Datos del Usuario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
          <div className="flex items-center mb-4">
            <div className="bg-gray-100 rounded-lg p-3 mr-3">
              <User className="w-6 h-6 text-primary-dark" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Datos Generales
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Nombre</p>
              <p className="text-gray-900">
                {user?.razon_social ||
                  `${user?.nombre} ${user?.apaterno} ${user?.amaterno}`}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Teléfono</p>
              <p className="text-gray-900">
                {user?.telefono || "No especificado"}
              </p>
            </div>
            {user?.direccion && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Dirección
                </p>
                <p className="text-gray-900">{user?.direccion}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resumen Financiero de Propiedades */}
        {(userType === "propietario" || userType === "both") &&
          hasPropiedades && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
              <div className="flex items-center mb-4">
                <div className="bg-gray-100 rounded-lg p-3 mr-3">
                  <TrendingUp className="w-6 h-6 text-primary-dark" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Resumen Financiero de Propiedades
                </h2>
              </div>

              {dashboardData.totalPropiedades > 0 ? (
                /* Contenido Real */
                <div className="space-y-4">
                  <div className="text-center bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      Total de Propiedades
                    </p>
                    <div className="flex items-center justify-center space-x-2">
                      <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                        {dashboardData.totalPropiedades}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {dashboardData.totalPropiedades} activas
                    </p>
                  </div>

                  {/* Métricas de saldos */}
                  <div className="grid grid-cols-1 gap-3 pt-3 border-t border-gray-200">
                    <div className="text-center bg-red-50 rounded-lg p-3">
                      <p className="text-sm md:text-base lg:text-lg font-bold text-red-600">
                        {dashboardData.propiedadesConSaldo}
                      </p>
                      <p className="text-xs text-red-600 mb-1">Con Saldo Pendiente</p>
                      <p className="text-sm font-semibold text-red-700">
                        {formatCurrency(dashboardData.totalSaldoVencidoPropiedades)}
                      </p>
                    </div>

                    <div className="text-center bg-green-50 rounded-lg p-3">
                      <p className="text-sm md:text-base lg:text-lg font-bold text-green-600">
                        {dashboardData.propiedadesSinSaldo}
                      </p>
                      <p className="text-xs text-green-600">Al Corriente</p>
                      <p className="text-sm font-semibold text-green-700">
                        Sin adeudos
                      </p>
                    </div>
                  </div>

                  {/* Métricas adicionales */}
                  {Number(dashboardData.totalM2 || 0) > 0 && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                      <div className="text-center bg-blue-50 rounded-lg p-3">
                        <p className="text-sm md:text-base lg:text-lg font-bold text-blue-600">
                          {Number(dashboardData.totalM2 || 0).toLocaleString(numberLocale)}{" "}
                          m²
                        </p>
                        <p className="text-xs text-blue-600">Metros Cuadrados</p>
                      </div>

                      <div className="text-center bg-purple-50 rounded-lg p-3">
                        <p className="text-sm md:text-base lg:text-lg font-bold text-purple-600">
                          {Number(dashboardData.totalIndiviso || 0).toFixed(4)}%
                        </p>
                        <p className="text-xs text-purple-600">Indiviso Total de las Áreas Privativas</p>
                      </div>
                    </div>
                  )}

                  {/* Botón para ver detalle */}
                  <button
                    onClick={() => router.push(msPath("/propiedades"))}
                    className="w-full mt-4 bg-primary-dark text-white py-3 rounded-lg hover:bg-primary-light hover:text-primary-dark transition-colors duration-200 font-medium"
                  >
                    Ver Todas las Propiedades
                  </button>
                </div>
              ) : null}
            </div>
          )}

        {/* Resumen Financiero de Comercios - Solo si tiene comercios */}
        {(userType === "arrendatario" || userType === "both") &&
          hasComerciosArrendamientos && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
              <div className="flex items-center mb-4">
                <div className="bg-gray-100 rounded-lg p-3 mr-3">
                  <Building2 className="w-6 h-6 text-primary-dark" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Resumen Financiero de Comercios
                </h2>
              </div>

              {comerciosData.totalComercios > 0 ? (
                /* Contenido Real */
                <div className="space-y-4">
                  <div className="text-center bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      Total de Comercios
                    </p>
                    <div className="flex items-center justify-center space-x-2">
                      <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                        {comerciosData.totalComercios}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {comerciosData.comerciosActivos} activos
                    </p>
                  </div>

                  {/* Métricas de saldos */}
                  <div className="grid grid-cols-1 gap-3 pt-3 border-t border-gray-200">
                    <div className="text-center bg-red-50 rounded-lg p-3">
                      <p className="text-sm md:text-base lg:text-lg font-bold text-red-600">
                        {comerciosData.conSaldoPendiente}
                      </p>
                      <p className="text-xs text-red-600 mb-1">Con Saldo Pendiente</p>
                      <p className="text-sm font-semibold text-red-700">
                        {formatCurrency(comerciosData.totalSaldoPendiente)}
                      </p>
                    </div>

                    <div className="text-center bg-green-50 rounded-lg p-3">
                      <p className="text-sm md:text-base lg:text-lg font-bold text-green-600">
                        {comerciosData.totalComercios - comerciosData.conSaldoPendiente}
                      </p>
                      <p className="text-xs text-green-600">Al Corriente</p>
                      <p className="text-sm font-semibold text-green-700">
                        Sin adeudos
                      </p>
                    </div>
                  </div>

                  {/* Métricas adicionales - M2 e Indiviso */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                    <div className="text-center bg-blue-50 rounded-lg p-3">
                      <p className="text-sm md:text-base lg:text-lg font-bold text-blue-600">
                        {Number(comerciosData.totalM2 || 0).toLocaleString(numberLocale)}{" "}
                        m²
                      </p>
                      <p className="text-xs text-blue-600">Metros Cuadrados</p>
                    </div>

                    <div className="text-center bg-purple-50 rounded-lg p-3">
                      <p className="text-sm md:text-base lg:text-lg font-bold text-purple-600">
                        {Number(comerciosData.totalIndiviso || 0).toFixed(4)}%
                      </p>
                      <p className="text-xs text-purple-600">Indiviso Total</p>
                    </div>
                  </div>

                  {/* Botón para ver detalle */}
                  <button
                    onClick={() => router.push(msPath("/arrendamientos"))}
                    className="w-full mt-4 bg-primary-dark text-white py-3 rounded-lg hover:bg-primary-light hover:text-primary-dark transition-colors duration-200 font-medium"
                  >
                    Ver Todos los Comercios
                  </button>
                </div>
              ) : null}
            </div>
          )}
      </div>
    </div>
  );
}
