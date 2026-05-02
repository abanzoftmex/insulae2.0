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
} from "lucide-react";

import { getCondominiumOverviewUseCase } from "@/modules/condominium";
import { getFinancialSummaryUseCase } from "@/modules/financial-summary";
import { getPrivateAreaListingUseCase } from "@/modules/private-areas";
import { getDirectoryUseCase } from "@/modules/directory";
import { getTicketListingUseCase } from "@/modules/tickets";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      <div>
        <h1 className="text-xl font-bold text-brand tracking-tight">
          Resumen del condominio
        </h1>
        <p className="text-[13px] text-ink-soft mt-0.5">
          {condominiumName} · {today}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Áreas privativas"
          value={stats.areas.toLocaleString()}
          icon={<MapPin strokeWidth={1.5} style={{ width: 14, height: 14 }} />}
          trend={{ label: "0.5%", up: true }}
        />
        <StatCard
          label="Residentes"
          value={stats.residents.toLocaleString()}
          icon={<Users strokeWidth={1.5} style={{ width: 14, height: 14 }} />}
        />
        <StatCard
          label="Cobranza"
          value={`$${(stats.collections / 1000).toFixed(1)}k`}
          icon={<DollarSign strokeWidth={1.5} style={{ width: 14, height: 14 }} />}
          trend={{ label: "12%", up: true }}
        />
        <StatCard
          label="Tickets abiertos"
          value={String(stats.openTickets)}
          icon={<TicketIcon strokeWidth={1.5} style={{ width: 14, height: 14 }} />}
          trend={stats.openTickets > 0 ? { label: String(stats.openTickets), up: false } : undefined}
        />
      </div>

      {/* Charts + recent tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-line">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
              Actividad financiera
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-semibold text-brand">
              Ver reporte
            </Button>
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-2">
            <FinancialChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-line">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
              Tickets recientes
            </CardTitle>
            <Link href="/tickets">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-semibold text-brand">
                Todos
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
                      <p className="text-[11px] text-ink-soft/60 truncate mt-0.5">
                        {ticket.residentName}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        ticket.status === "OPEN"
                          ? "bg-brand-mint/50 text-brand"
                          : "bg-canvas text-ink-soft/50"
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-ink-soft/20">
                <TicketIcon style={{ width: 20, height: 20 }} className="mb-2 opacity-20" />
                <p className="text-[11px] font-medium tracking-widest uppercase">
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
          icon={<FileText strokeWidth={1.5} style={{ width: 16, height: 16 }} />}
          title="Generar reporte"
          description="Estado actual del condominio en PDF."
          cta="Continuar"
        />
        <QuickAction
          href="/cobros-masivos"
          icon={<Zap strokeWidth={1.5} style={{ width: 16, height: 16 }} />}
          title="Cobros masivos"
          description="Proceso de cobranza para todas las áreas."
          cta="Lanzar"
        />
        <QuickAction
          href="/notificaciones"
          icon={<Bell strokeWidth={1.5} style={{ width: 16, height: 16 }} />}
          title="Notificación masiva"
          description="Comunicados masivos vía email/push."
          cta="Redactar"
        />
      </div>
    </div>
  );
}

// ─── Local sub-components ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  trend?: { label: string; up: boolean };
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft/60 leading-tight">
          {label}
        </p>
        {icon && (
          <span className="p-1.5 rounded-md bg-canvas text-brand-accent/50">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-[26px] font-bold text-brand leading-none tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${
              trend.up
                ? "bg-brand-mint/40 text-brand"
                : "bg-danger/10 text-danger"
            }`}
          >
            {trend.up ? "↑" : "↓"} {trend.label}
          </span>
        )}
      </div>
    </Card>
  );
}

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
          <span className="inline-flex items-center justify-center rounded-lg bg-canvas text-brand-accent group-hover:bg-brand-mint/30 transition-standard"
            style={{ width: 32, height: 32 }}>
            {icon}
          </span>
          <h3 className="text-[13px] font-semibold text-brand">{title}</h3>
        </div>
        <p className="text-[12px] text-ink-soft leading-relaxed mb-4">
          {description}
        </p>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-accent group-hover:gap-1.5 transition-all">
          {cta}
          <ArrowRight style={{ width: 12, height: 12 }} />
        </span>
      </Card>
    </Link>
  );
}
