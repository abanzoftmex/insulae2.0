"use client";

/** Panel de Control (antes pages/dashboard.js). Los datos llegan cargados desde page.tsx. */
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, DollarSign, Home, Landmark, TrendingUp, User, type LucideIcon } from "lucide-react";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import { BannerAside, BannerMetric, PageBanner } from "@/components/minisitio/ui/page-banner";
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


  const tipoUsuario = userType === "both" ? "Propietario y Comercio" : userType === "propietario" ? "Propietario" : "Comercio";
  const esPropietario = (userType === "propietario" || userType === "both") && hasPropiedades;
  const esComercio = (userType === "arrendatario" || userType === "both") && hasComerciosArrendamientos;
  const nombre = user?.razon_social || [user?.nombre, user?.apaterno, user?.amaterno].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      {/* Encabezado con las métricas principales */}
      <PageBanner
        id="panel-titulo"
        title="Panel de Control"
        subtitle={
          <span suppressHydrationWarning>
            Resumen general de tu cuenta ·{" "}
            {new Date().toLocaleDateString("es-MX", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone,
            })}
          </span>
        }
        aside={<BannerAside icon={User} value={tipoUsuario} label="Tipo de usuario" />}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <BannerMetric icon={DollarSign} tone="gold" value={formatCurrency(dashboardData.saldoVencido)} label="Saldo Pendiente" />
          {esPropietario && (
            <BannerMetric icon={Home} value={String(dashboardData.totalPropiedades)} label="Propiedades" href={msPath("/propiedades")} />
          )}
          {esComercio && (
            <BannerMetric
              icon={Landmark}
              value={String(dashboardData.totalArrendamientos)}
              label="Comercios"
              href={msPath("/arrendamientos")}
            />
          )}
        </div>
      </PageBanner>

      {/* Cada tarjeta con su propio alto: estiradas, "Datos Generales" quedaba con media tarjeta vacía. */}
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Datos del usuario */}
        <Card icon={User} title="Datos Generales">
          <dl className="space-y-4">
            <Field label="Nombre">{nombre}</Field>
            <Field label="Email">
              <span className="block truncate" title={user?.email ?? undefined}>
                {user?.email}
              </span>
            </Field>
            <Field label="Teléfono">{user?.telefono || <span className="text-fg-4">No especificado</span>}</Field>
            {user?.direccion && <Field label="Dirección">{user.direccion}</Field>}
          </dl>
        </Card>

        {/* Resumen financiero de propiedades */}
        {esPropietario && (
          <Card icon={TrendingUp} title="Resumen Financiero de Propiedades">
            {dashboardData.totalPropiedades > 0 ? (
              <Resumen
                totalLabel="Total de Propiedades"
                total={dashboardData.totalPropiedades}
                activos={`${dashboardData.totalPropiedades} activas`}
                conSaldo={dashboardData.propiedadesConSaldo}
                montoConSaldo={formatCurrency(dashboardData.totalSaldoVencidoPropiedades)}
                alCorriente={dashboardData.propiedadesSinSaldo}
                m2={
                  Number(dashboardData.totalM2 || 0) > 0
                    ? {
                        superficie: Number(dashboardData.totalM2 || 0).toLocaleString(numberLocale),
                        indiviso: Number(dashboardData.totalIndiviso || 0).toFixed(4),
                        indivisoLabel: "Indiviso Total de las Áreas Privativas",
                      }
                    : null
                }
                cta="Ver Todas las Propiedades"
                href={msPath("/propiedades")}
              />
            ) : null}
          </Card>
        )}

        {/* Resumen financiero de comercios */}
        {esComercio && (
          <Card icon={Landmark} title="Resumen Financiero de Comercios">
            {comerciosData.totalComercios > 0 ? (
              <Resumen
                totalLabel="Total de Comercios"
                total={comerciosData.totalComercios}
                activos={`${comerciosData.comerciosActivos} activos`}
                conSaldo={comerciosData.conSaldoPendiente}
                montoConSaldo={formatCurrency(comerciosData.totalSaldoPendiente)}
                alCorriente={comerciosData.totalComercios - comerciosData.conSaldoPendiente}
                m2={{
                  superficie: Number(comerciosData.totalM2 || 0).toLocaleString(numberLocale),
                  indiviso: Number(comerciosData.totalIndiviso || 0).toFixed(4),
                  indivisoLabel: "Indiviso Total",
                }}
                cta="Ver Todos los Comercios"
                href={msPath("/arrendamientos")}
              />
            ) : null}
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stroke-2 bg-card p-5 lg:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-brand">
          <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <h2 className="text-[16px] font-semibold leading-6 text-fg">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium leading-4 text-fg-3">{label}</dt>
      <dd className="mt-1 text-[14px] leading-5 text-fg">{children}</dd>
    </div>
  );
}

/** Resumen financiero de propiedades o comercios: total, con saldo, al corriente y superficie. */
function Resumen({
  totalLabel,
  total,
  activos,
  conSaldo,
  montoConSaldo,
  alCorriente,
  m2,
  cta,
  href,
}: {
  totalLabel: string;
  total: number;
  activos: string;
  conSaldo: number;
  montoConSaldo: string;
  alCorriente: number;
  m2: { superficie: string; indiviso: string; indivisoLabel: string } | null;
  cta: string;
  href: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-surface-2 p-4 text-center ring-1 ring-inset ring-stroke-3">
        <p className="text-[13px] font-medium text-fg-3">{totalLabel}</p>
        <p className="mt-1 text-[28px] font-bold leading-9 tracking-[-0.02em] text-fg tabular-nums">{total}</p>
        <p className="text-[12px] text-fg-3">{activos}</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-xl bg-critical-bg p-3.5 text-center ring-1 ring-inset ring-overdue/10">
          <p className="text-[20px] font-bold leading-7 text-overdue tabular-nums">{conSaldo}</p>
          <p className="text-[12px] font-medium text-overdue/85">Con Saldo Pendiente</p>
          <p className="mt-1 truncate text-[13px] font-semibold text-overdue tabular-nums" title={montoConSaldo}>
            {montoConSaldo}
          </p>
        </div>
        <div className="rounded-xl bg-success-bg p-3.5 text-center ring-1 ring-inset ring-success/10">
          <p className="text-[20px] font-bold leading-7 text-success tabular-nums">{alCorriente}</p>
          <p className="text-[12px] font-medium text-success/85">Al Corriente</p>
          <p className="mt-1 text-[13px] font-semibold text-success">Sin adeudos</p>
        </div>
      </div>

      {m2 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 p-3.5 text-center ring-1 ring-inset ring-stroke-3">
            <p className="text-[16px] font-bold leading-6 text-fg tabular-nums">{m2.superficie} m²</p>
            <p className="text-[12px] leading-4 text-fg-3">Metros Cuadrados</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3.5 text-center ring-1 ring-inset ring-stroke-3">
            <p className="text-[16px] font-bold leading-6 text-fg tabular-nums">{m2.indiviso}%</p>
            <p className="text-[12px] leading-4 text-fg-3">{m2.indivisoLabel}</p>
          </div>
        </div>
      )}

      <Link
        href={href}
        className="group mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[14px] font-semibold text-white outline-none transition-colors duration-150 hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 active:bg-brand-deep"
      >
        {cta}
        <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" strokeWidth={2.25} />
      </Link>
    </div>
  );
}
