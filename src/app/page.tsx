import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  MapPin,
  Ticket as TicketIcon,
  ArrowRight,
  FileText,
  Zap,
  Bell,
  DollarSign,
} from "lucide-react";

import { getCondominiumOverviewUseCase } from "@/modules/condominium";
import { getFinancialSummaryUseCase } from "@/modules/financial-summary";
import { getDirectoryUseCase } from "@/modules/directory";
import { prisma } from "@/shared/infrastructure/db/prisma";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { FinancialChart } from "@/components/ui/financial-chart";

export const metadata: Metadata = {
  title: "Inicio | Val'Quirico",
  description: "Inicio operativo del condominio con accesos rápidos a módulos principales.",
};

export default async function Home() {
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  const [
    condominiumOverview,
    financialSummaryCurrent,
    financialSummaryPrev,
    directoryOverview,
    openTicketsCount,
  ] = await Promise.all([
    getCondominiumOverviewUseCase.execute(),
    getFinancialSummaryUseCase.execute({ year: currentYear }),
    getFinancialSummaryUseCase.execute({ year: prevYear }),
    getDirectoryUseCase.execute({ query: "", page: 1, pageSize: 1 }),
    prisma.ticket.count({
      where: {
        condominium: { isActive: true },
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    }),
  ]);

  // Use the most recent year that has actual financial data
  const hasCurrentYearData = financialSummaryCurrent?.months.some(
    (m) => m.totalIncome > 0 || m.totalExpenses > 0,
  );
  const financialSummary = hasCurrentYearData
    ? financialSummaryCurrent
    : (financialSummaryPrev ?? financialSummaryCurrent);

  const stats = {
    areas: condominiumOverview?.activePrivateAreas ?? 0,
    residents: directoryOverview?.totalUsers ?? 0,
    collections: financialSummary?.totals.totalIncome ?? 0,
    openTickets: openTicketsCount,
  };

  const reportYear = financialSummary?.year ?? currentYear;

  const MONTH_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  // Only include months that have at least some income or expense data
  const chartData = (financialSummary?.months ?? [])
    .filter((m) => m.totalIncome > 0 || m.totalExpenses > 0)
    .map((m) => ({
      month: MONTH_ABBR[(m.month - 1) % 12],
      ingresos: m.totalIncome,
      gastos: m.totalExpenses,
    }));

  const condominiumName =
    condominiumOverview?.condominiumName || "Val'Quirico";
  const today = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">
            Bienvenido a tu gestor de condominio
          </h1>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Información y Gestión</Badge>
          <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
            {condominiumName} · {today} · {new Date().toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          accent="brand"
          label="Áreas privativas"
          value={stats.areas.toLocaleString()}
          icon={<MapPin className="h-3.5 w-3.5" />}
          trend={{ value: "+0.5%", isUp: true }}
        />
        <StatCard
          accent="lime"
          label="Residentes"
          value={stats.residents.toLocaleString()}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <StatCard
          accent="gold"
          label={`Cobranza Anual (${reportYear})`}
          value={`$${stats.collections.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={<DollarSign className="h-3.5 w-3.5" />}
          trend={{ value: "Total Recaudado", isUp: true }}
        />
        <StatCard
          accent="cyan"
          label="Tickets abiertos"
          value={String(stats.openTickets)}
          icon={<TicketIcon className="h-3.5 w-3.5" />}
          trend={stats.openTickets > 0 ? { value: String(stats.openTickets), isUp: false } : undefined}
        />
      </div>

      {/* Actividad Financiera Chart Card */}
      <div className="w-full">
        <Card className="w-full">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex flex-col gap-0.5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">
              Actividad Financiera: Ingresos vs Gastos ({reportYear})
            </CardTitle>
            <p className="text-[9px] text-white/70 font-semibold uppercase tracking-wider">
              Comparativo mensual del flujo de caja (Recaudación de cuotas vs Egresos del condominio)
            </p>
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-4">
            {chartData.length > 0 ? (
              <FinancialChart data={chartData} />
            ) : (
              <div className="flex items-center justify-center h-[160px] text-[12px] text-ink-soft/50 font-medium">
                Sin movimientos registrados para {reportYear}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <QuickAction
          href="/reporte-condominio"
          icon={<FileText className="h-4 w-4" />}
          title="Generar reporte"
          description="Estado actual del condominio en PDF."
          cta="Continuar"
        />
        <QuickAction
          href="/cobros-masivos"
          icon={<Zap className="h-4 w-4" />}
          title="Cobros masivos"
          description="Proceso de cobranza para todas las áreas."
          cta="Lanzar"
        />
        <QuickAction
          href="/notificaciones"
          icon={<Bell className="h-4 w-4" />}
          title="Notificación masiva"
          description="Comunicados masivos vía email/push."
          cta="Redactar"
        />
      </div>
    </div>
  );
}

// ─── Local sub-components ────────────────────────────────────────────────────

function QuickAction({
  href,
  icon,
  title,
  description,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="p-5 h-full transition-standard hover:shadow-md cursor-pointer">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-brand-deep text-brand-mint shrink-0 group-hover:bg-brand transition-colors">
            {icon}
          </span>
          <h3 className="text-[13px] font-bold text-brand">{title}</h3>
        </div>
        <p className="text-[12px] text-ink-soft/80 leading-relaxed mb-4">
          {description}
        </p>
        <span className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-brand-deep text-white text-[10px] font-bold uppercase tracking-tight shadow-md shadow-brand-deep/25 group-hover:bg-brand transition-colors">
          <ArrowRight className="h-3 w-3" /> {cta}
        </span>
      </Card>
    </Link>
  );
}
