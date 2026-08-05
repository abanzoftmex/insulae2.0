import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  DollarSign,
  FileText,
  Image as ImageIcon,
  MapPin,
  Paperclip,
  Scale,
  Ticket as TicketIcon,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { getCondominiumOverviewUseCase } from "@/modules/condominium";
import { getFinancialSummaryUseCase } from "@/modules/financial-summary";
import { getDirectoryUseCase } from "@/modules/directory";
import { prisma } from "@/shared/infrastructure/db/prisma";

import { FinancialChart } from "@/components/ui/financial-chart";
import { LiveClock } from "@/components/ui/live-clock";
import {
  ActionRow,
  EmptyState,
  InvertedLink,
  Metric,
  ModuleCard,
  StatusBadge,
  SubtleLink,
  Surface,
  SurfaceHeader,
} from "@/components/ui/fluent";

export const metadata: Metadata = {
  title: "Inicio | Val'Quirico",
  description: "Inicio operativo del condominio con accesos rápidos a módulos principales.",
};

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/Mexico_City";
const MONTH_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const TICKET_STATUS: Record<
  string,
  { label: string; tone: "neutral" | "brand" | "positive" | "critical" }
> = {
  OPEN: { label: "Abierto", tone: "brand" },
  IN_PROGRESS: { label: "En proceso", tone: "neutral" },
  RESOLVED: { label: "Resuelto", tone: "positive" },
  CLOSED: { label: "Cerrado", tone: "neutral" },
};

/** Saludo según la hora local del condominio, no la del servidor. */
function greetingFor(date: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(date),
  );
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function firstName(fullName: string): string {
  const [first] = fullName.trim().split(/\s+/);
  return first || fullName;
}

async function getSessionUserName(): Promise<string | null> {
  try {
    const sessionStr = (await cookies()).get("insulae_session")?.value;
    if (!sessionStr) return null;
    const session = JSON.parse(sessionStr) as { name?: string };
    return session.name?.trim() || null;
  } catch {
    return null;
  }
}

function formatShortDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(value);
}

function formatCount(value: number): string {
  return value.toLocaleString("es-MX");
}

/** Importes compactos: en un KPI, `$1.2M` informa lo mismo que 12 dígitos y no rompe la caja. */
function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${abs.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

export default async function Home() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const prevYear = currentYear - 1;
  const activeCondominium = { condominium: { isActive: true } };

  const [
    userName,
    condominiumOverview,
    financialSummaryCurrent,
    financialSummaryPrev,
    directoryOverview,
    openTicketsCount,
    ticketStatusBreakdown,
    recentTickets,
    recentNotifications,
    activeNoticesCount,
    debtAreasCount,
  ] = await Promise.all([
    getSessionUserName(),
    getCondominiumOverviewUseCase.execute(),
    getFinancialSummaryUseCase.execute({ year: currentYear }),
    getFinancialSummaryUseCase.execute({ year: prevYear }),
    getDirectoryUseCase.execute({ query: "", page: 1, pageSize: 1 }),
    prisma.ticket.count({
      where: { ...activeCondominium, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.ticket.groupBy({
      by: ["status"],
      where: activeCondominium,
      _count: { _all: true },
    }),
    prisma.ticket.findMany({
      where: { ...activeCondominium, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { openedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        openedAt: true,
        department: { select: { name: true } },
        privateArea: { select: { code: true, name: true } },
      },
    }),
    prisma.notification.findMany({
      where: activeCondominium,
      orderBy: [{ sentAt: { sort: "desc", nulls: "last" } }],
      take: 5,
      select: {
        id: true,
        title: true,
        message: true,
        sentAt: true,
        imageUrl: true,
        pdfUrl: true,
        categoryRef: { select: { name: true } },
      },
    }),
    prisma.notification.count({
      where: { ...activeCondominium, validUntil: { gte: now } },
    }),
    // Sólo el CONTEO de áreas con cargos abiertos: los montos de cartera
    // migrados están inflados y no deben publicarse como importe.
    //
    // Se cuenta a nivel PADRE (`parentPrivateAreaId: null`) a propósito: el
    // padrón que muestra la tarjeta de al lado (`activePrivateAreas`) también
    // es de padres. Contar por `Charge.privateAreaId` sin filtrar mete las
    // 1,254 áreas hijas y el porcentaje se dispara por encima del 100%.
    prisma.privateArea.count({
      where: {
        ...activeCondominium,
        parentPrivateAreaId: null,
        charges: { some: { isCollectible: true, status: { in: ["OPEN", "PARTIAL"] } } },
      },
    }),
  ]);

  // Usa el año más reciente que efectivamente tenga movimientos.
  const hasCurrentYearData = financialSummaryCurrent?.months.some(
    (m) => m.totalIncome > 0 || m.totalExpenses > 0,
  );
  const financialSummary = hasCurrentYearData
    ? financialSummaryCurrent
    : (financialSummaryPrev ?? financialSummaryCurrent);

  const reportYear = financialSummary?.year ?? currentYear;
  const totalIncome = financialSummary?.totals.totalIncome ?? 0;
  const totalExpenses = financialSummary?.totals.totalExpenses ?? 0;
  const netBalance = totalIncome - totalExpenses;

  const activeAreas = condominiumOverview?.activePrivateAreas ?? 0;
  const debtCoverage = activeAreas > 0 ? Math.round((debtAreasCount / activeAreas) * 100) : 0;

  const ticketCounts = ticketStatusBreakdown.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});
  const totalTickets = Object.values(ticketCounts).reduce((sum, n) => sum + n, 0);

  const chartData = (financialSummary?.months ?? [])
    .filter((m) => m.totalIncome > 0 || m.totalExpenses > 0)
    .map((m) => ({
      month: MONTH_ABBR[(m.month - 1) % 12],
      ordinaryIncome: m.ordinaryIncome,
      extraordinaryIncome: m.extraordinaryIncome,
      otherIncome: m.otherIncome,
      totalIncome: m.totalIncome,
      ordinaryExpenses: m.ordinaryExpenses,
      extraordinaryExpenses: m.extraordinaryExpenses,
      totalExpenses: m.totalExpenses,
    }));

  const condominiumName = condominiumOverview?.condominiumName || "Val'Quirico";
  const initialDate = now.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
  const initialTime = now.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  });

  return (
    <div className="space-y-5">
      {/* ── Banner de bienvenida ───────────────────────────────────────────
          Color de marca PLANO. Lo que hacía que la versión anterior se leyera
          decorativa no era el color: era el gradiente de tres paradas, las
          pastillas y las sombras sobre el texto. Un banner de marca sólido sí
          es Fluent — es el patrón de cabecera de los productos de Microsoft.

          Opacidades del texto calibradas contra #5d5b35: blanco 6.97:1,
          blanco/90 ~5.9:1 y blanco/80 ~5.1:1. Por debajo de /80 el texto de
          12px cae bajo AA, así que ese es el piso. */}
      <section className="relative overflow-hidden rounded-panel bg-brand px-6 py-6">
        {/* Marca de agua completa, separada del borde: el logo lleva el escudo
            a la izquierda y el logotipo a la derecha, así que al sangrarlo se
            perdía justo el final de la palabra y se leía como un recorte, no
            como una marca.

            Opacidad 8%: sobre el olivo, el blanco del logo levanta el fondo a
            ~#6b6947, así que el texto blanco encima sigue en 5.6:1 — AA incluso
            donde se superpone. Por eso el texto puede pasar por encima sin
            reservarle hueco. */}
        <Image
          src="/brand/valquirico-logo-light.png"
          alt=""
          aria-hidden
          width={1077}
          height={290}
          priority
          className="pointer-events-none absolute right-6 top-1/2 hidden w-[420px] -translate-y-1/2 opacity-[0.08] md:block"
        />

        <div className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[12px] leading-4 text-white/80">
              Insulae 2.0 · {condominiumName} ·{" "}
              <LiveClock initialDate={initialDate} initialTime={initialTime} />
            </p>
            <h1 className="mt-1.5 text-[28px] font-semibold leading-9 tracking-[-0.02em] text-white">
              {greetingFor(now)}
              {userName ? `, ${firstName(userName)}` : ""}
            </h1>
            <p className="mt-2 text-[14px] leading-5 text-white/90">
              Plataforma de administración condominal: padrón de residentes y áreas
              privativas, cuotas y cobranza, finanzas, comunicados, gobernanza y
              atención a incidencias.
            </p>
            <div className="mt-4">
              <InvertedLink href="/estadisticas" icon={<BarChart3 className="h-4 w-4" />}>
                Ver estadísticas
              </InvertedLink>
            </div>
          </div>

        </div>
      </section>

      {/* ── Indicadores ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric
          label="Áreas privativas"
          value={formatCount(activeAreas)}
          footnote={`${formatCount(condominiumOverview?.inactivePrivateAreas ?? 0)} inactivas`}
          icon={<MapPin className="h-4 w-4" />}
        />
        <Metric
          label="Residentes"
          value={formatCount(directoryOverview?.totalUsers ?? 0)}
          footnote="En el directorio"
          icon={<Users className="h-4 w-4" />}
        />
        <Metric
          label={`Cobranza ${reportYear}`}
          value={formatMoney(totalIncome)}
          footnote="Total recaudado"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <Metric
          label={`Balance ${reportYear}`}
          value={formatMoney(netBalance)}
          footnote={netBalance >= 0 ? "Superávit del ejercicio" : "Déficit del ejercicio"}
          tone={netBalance >= 0 ? "positive" : "critical"}
          icon={<Scale className="h-4 w-4" />}
        />
        <Metric
          label="Tickets abiertos"
          value={formatCount(openTicketsCount)}
          footnote={`${formatCount(totalTickets)} en total`}
          icon={<TicketIcon className="h-4 w-4" />}
        />
        <Metric
          label="Áreas con adeudo"
          value={formatCount(debtAreasCount)}
          footnote={activeAreas > 0 ? `${debtCoverage}% del padrón` : "Sin padrón activo"}
          tone={debtAreasCount > 0 ? "critical" : "neutral"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* ── Módulos de gestión ─────────────────────────────────────────────
          Las cuatro entradas vienen de la versión de `9d6a82c` ("Módulos de
          Gestión Diario"), incluidas sus descripciones. Se mantienen como
          TARJETAS y no como filas: aquí la descripción explica qué hay dentro
          del módulo, y eso justifica el espacio. El acceso rápido de abajo es
          sólo un destino, por eso ese sí va como fila. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-[14px] font-semibold leading-5 text-fg">
            Módulos de gestión
          </h2>
          <span className="text-[12px] leading-4 text-fg-3">
            Selecciona una categoría para navegar
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ModuleCard
            href="/directorio"
            icon={<Users className="h-4 w-4" />}
            badge="Comunidad"
            title="Propietarios y residentes"
            description="Directorio unificado de residentes, arrendatarios, arrendadores y contactos de emergencia."
            cta="Ver directorio"
          />
          <ModuleCard
            href="/areas-privativas"
            icon={<MapPin className="h-4 w-4" />}
            badge="Inmuebles"
            title="Áreas privativas"
            description="Catálogo de lotes, viviendas, locales comerciales y zonas del condominio."
            cta="Ver inmuebles"
          />
          <ModuleCard
            href="/tickets"
            icon={<TicketIcon className="h-4 w-4" />}
            badge="Atención"
            title="Solicitudes y soporte"
            description="Seguimiento de tickets, reportes de mantenimiento y solicitudes de residentes."
            cta="Atender solicitudes"
          />
          <ModuleCard
            href="/reglamentos"
            icon={<BookOpen className="h-4 w-4" />}
            badge="Normativa"
            title="Documentos y reglamentos"
            description="Estatutos condominales, acuerdos de asamblea y normas comunitarias de convivencia."
            cta="Consultar normas"
          />
        </div>
      </section>

      {/* ── Finanzas + tickets ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Surface className="flex flex-col xl:col-span-8">
          <SurfaceHeader
            title="Actividad financiera"
            subtitle={`Ingresos y egresos mensuales · ${reportYear}`}
            action={<SubtleLink href="/resumen-financiero">Ver resumen</SubtleLink>}
          />
          {/* min-h da un piso cuando la columna NO se estira (móvil): sin él,
              un contenedor de altura indeterminada colapsa la gráfica a 0. */}
          <div className="min-h-[260px] flex-1 px-1 py-3">
            {chartData.length > 0 ? (
              <FinancialChart data={chartData} />
            ) : (
              <EmptyState message={`Sin movimientos registrados en ${reportYear}`} />
            )}
          </div>
        </Surface>

        <Surface className="flex flex-col xl:col-span-4">
          <SurfaceHeader
            title="Tickets"
            subtitle={`${formatCount(openTicketsCount)} requieren atención`}
            action={<SubtleLink href="/tickets">Ver todos</SubtleLink>}
          />

          <div className="grid grid-cols-4 divide-x divide-stroke-3 border-b border-stroke-3">
            {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((status) => (
              <div key={status} className="px-1 py-3 text-center">
                <p className="text-[20px] font-semibold leading-6 text-fg tabular-nums">
                  {formatCount(ticketCounts[status] ?? 0)}
                </p>
                <p className="mt-0.5 text-[12px] leading-4 text-fg-3">
                  {TICKET_STATUS[status].label}
                </p>
              </div>
            ))}
          </div>

          {recentTickets.length === 0 ? (
            <EmptyState message="Sin tickets pendientes." />
          ) : (
            <ul className="divide-y divide-stroke-3">
              {recentTickets.map((ticket) => {
                const status = TICKET_STATUS[ticket.status];
                const area = ticket.privateArea?.code || ticket.privateArea?.name;
                return (
                  <li key={ticket.id} className="px-4 py-3 transition-colors hover:bg-surface-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-[14px] font-medium leading-5 text-fg">
                        {ticket.title}
                      </p>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] leading-4 text-fg-3">
                      {[ticket.department?.name, area, formatShortDate(ticket.openedAt)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Surface>
      </div>

      {/* ── Comunicados + accesos ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Surface className="xl:col-span-8">
          <SurfaceHeader
            title="Comunicados"
            subtitle={
              activeNoticesCount > 0
                ? `${formatCount(activeNoticesCount)} vigentes`
                : "Últimos publicados"
            }
            action={<SubtleLink href="/notificaciones">Ver todos</SubtleLink>}
          />
          {recentNotifications.length === 0 ? (
            <EmptyState message="Aún no hay comunicados publicados." />
          ) : (
            <ul className="divide-y divide-stroke-3">
              {recentNotifications.map((notice) => (
                <li
                  key={notice.id}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[14px] font-medium leading-5 text-fg">
                        {notice.title}
                      </p>
                      {notice.imageUrl && <ImageIcon className="h-3.5 w-3.5 shrink-0 text-fg-4" />}
                      {notice.pdfUrl && <Paperclip className="h-3.5 w-3.5 shrink-0 text-fg-4" />}
                    </div>
                    <p className="truncate text-[12px] leading-4 text-fg-3">{notice.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {notice.categoryRef?.name && (
                      <StatusBadge>{notice.categoryRef.name}</StatusBadge>
                    )}
                    <span className="w-14 text-right text-[12px] leading-5 text-fg-3 tabular-nums">
                      {formatShortDate(notice.sentAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface className="xl:col-span-4">
          <SurfaceHeader title="Acciones frecuentes" subtitle="Tareas del día a día" />
          {/* Copy tomado de "Acciones Frecuentes" de `9d6a82c`. Aquí NO se
              repiten directorio, áreas privativas ni reglamentos: ya son
              tarjetas arriba, y duplicar el mismo destino en dos formatos
              obliga a leer la página dos veces para saber que llevan al mismo
              sitio. Esto son acciones (hacer algo), no módulos (ir a algo). */}
          <div className="py-1">
            <ActionRow
              href="/reporte-condominio"
              icon={<FileText className="h-4 w-4" />}
              label="Generar ficha del condominio"
              description="Estado actual y ficha técnica en PDF"
            />
            <ActionRow
              href="/cobros-masivos"
              icon={<Zap className="h-4 w-4" />}
              label="Cobros masivos"
              description="Emisión de cuotas ordinarias y extraordinarias"
            />
            <ActionRow
              href="/notificaciones"
              icon={<Bell className="h-4 w-4" />}
              label="Redactar comunicado"
              description="Avisos por correo o portal del residente"
            />
            <ActionRow
              href="/estadisticas"
              icon={<BarChart3 className="h-4 w-4" />}
              label="Estadísticas del condominio"
              description="Ocupación, giros y perfil de la comunidad"
            />
            <ActionRow
              href="/resumen-financiero"
              icon={<Wallet className="h-4 w-4" />}
              label="Resumen financiero"
              description="Balance, cartera y resultados"
            />
          </div>
        </Surface>
      </div>
    </div>
  );
}
