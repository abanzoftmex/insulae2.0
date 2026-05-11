import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  MapPin,
  DollarSign,
  Ticket as TicketIcon,
  ArrowRight,
  FileText,
  Zap,
  Bell,
  Activity,
} from "lucide-react";

import { getCondominiumOverviewUseCase } from "@/modules/condominium";
import { getFinancialSummaryUseCase } from "@/modules/financial-summary";
import { getPrivateAreaListingUseCase } from "@/modules/private-areas";
import { getDirectoryUseCase } from "@/modules/directory";
import { getTicketListingUseCase } from "@/modules/tickets";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { FinancialChart } from "@/components/ui/financial-chart";

export const metadata: Metadata = {
  title: "Inicio | Insulae 2.0",
  description: "Inicio operativo del condominio con accesos rápidos a módulos principales.",
};

export default async function Home() {
  const currentYear = 2026;

  const [
    condominiumOverview,
    financialSummary,
    privateAreaListing,
    directoryOverview,
    ticketListing,
  ] = await Promise.all([
    getCondominiumOverviewUseCase.execute(),
    getFinancialSummaryUseCase.execute({ year: currentYear }),
    getPrivateAreaListingUseCase.execute({ page: 1, pageSize: 1 }),
    getDirectoryUseCase.execute({ query: "", page: 1, pageSize: 1 }),
    getTicketListingUseCase.execute(),
  ]);

  const stats = {
    areas: privateAreaListing?.summary.registeredAreas ?? 0,
    residents: directoryOverview?.totalUsers ?? 0,
    collections: financialSummary?.totals.totalIncome ?? 0,
    openTickets:
      ticketListing?.rows.filter(
        (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
      ).length ?? 0,
  };

  const recentTickets = ticketListing?.rows.slice(0, 5) ?? [];

  const MONTH_ABBR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const chartData = (financialSummary?.months ?? []).map((m) => ({
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
            Resumen del condominio
          </h1>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Panel Operativo</Badge>
          <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
            {condominiumName} · {today}
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
          label="Cobranza"
          value={`$${(stats.collections / 1000).toFixed(1)}k`}
          icon={<DollarSign className="h-3.5 w-3.5" />}
          trend={{ value: "+12%", isUp: true }}
        />
        <StatCard
          accent="cyan"
          label="Tickets abiertos"
          value={String(stats.openTickets)}
          icon={<TicketIcon className="h-3.5 w-3.5" />}
          trend={stats.openTickets > 0 ? { value: String(stats.openTickets), isUp: false } : undefined}
        />
      </div>

      {/* Charts + recent tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">
              Actividad financiera
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-3 gap-1.5 text-[10px] font-bold text-brand bg-white rounded-full uppercase tracking-tight hover:bg-brand-mint">
              <Activity className="h-3 w-3" /> Ver reporte
            </Button>
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-2">
            <FinancialChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">
              Tickets recientes
            </CardTitle>
            <Link href="/tickets">
              <Button variant="ghost" size="sm" className="h-7 px-3 gap-1.5 text-[10px] font-bold text-brand bg-white rounded-full uppercase tracking-tight hover:bg-brand-mint">
                <ArrowRight className="h-3 w-3" /> Todos
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentTickets.length > 0 ? (
              <ul>
                {recentTickets.map((ticket, i) => (
                  <li
                    key={ticket.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${
                      i < recentTickets.length - 1 ? "border-b border-line/50" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate leading-snug">
                        {ticket.title}
                      </p>
                      <p className="text-[11px] text-ink-soft/70 truncate mt-0.5">
                        {ticket.residentName}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                        ticket.status === "OPEN"
                          ? "bg-brand/15 text-brand border border-brand/25"
                          : "bg-canvas text-ink-soft/60 border border-line"
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-ink-soft/50">
                <TicketIcon style={{ width: 20, height: 20 }} className="mb-2 opacity-40" />
                <p className="text-[11px] font-bold tracking-widest uppercase">
                  Sin tickets
                </p>
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
