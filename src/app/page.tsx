import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import {
  Users,
  MapPin,
  Ticket as TicketIcon,
  ArrowRight,
  FileText,
  Zap,
  Bell,
  BookOpen,
  BarChart3,
  PieChart,
  CheckCircle2,
  HeartHandshake,
} from "lucide-react";

import { getCondominiumOverviewUseCase } from "@/modules/condominium";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveClock } from "@/components/ui/live-clock";

export const metadata: Metadata = {
  title: "Inicio | Val'Quirico",
  description: "Bienvenida y accesos principales a la gestión operativa del condominio.",
};

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/Mexico_City";

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

export default async function Home() {
  const now = new Date();
  const [userName, condominiumOverview] = await Promise.all([
    getSessionUserName(),
    getCondominiumOverviewUseCase.execute(),
  ]);

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
    <div className="space-y-8 pb-12">
      {/* ─── Header / Banner de Bienvenida Cálida ───────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-deep via-brand to-brand-deep p-6 md:p-8 text-white shadow-lg border border-brand/20">
        {/* Marca de agua traslúcida */}
        <Image
          src="/brand/valquirico-logo-light.png"
          alt=""
          aria-hidden
          width={1077}
          height={290}
          priority
          className="pointer-events-none absolute right-6 top-1/2 hidden w-[380px] -translate-y-1/2 opacity-[0.08] md:block"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="brand"
                className="rounded-full px-3.5 py-1 text-[10px] tracking-widest bg-brand-mint text-brand-deep font-bold border-none uppercase shadow-xs"
              >
                Gestor de Condominio
              </Badge>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-semibold tracking-wider uppercase border border-white/15">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Operatividad Normal
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {greetingFor(now)}
              {userName ? `, ${firstName(userName)}` : ""}!
            </h1>

            <p className="text-white/85 text-xs md:text-sm font-medium leading-relaxed">
              Te damos la bienvenida a {condominiumName}. Tu centro de control y convivencia comunitaria. Aquí podrás gestionar accesos, comunicarte con residentes y consultar la documentación oficial de manera sencilla y transparente.
            </p>

            <div className="pt-1 text-[11px] font-bold text-brand-mint/90 uppercase tracking-wider flex items-center gap-2">
              <span>{condominiumName}</span>
              <span>·</span>
              <LiveClock initialDate={initialDate} initialTime={initialTime} />
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5">
            <Link
              href="/directorio"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-mint text-brand-deep font-bold text-xs hover:bg-white transition-standard shadow-sm"
            >
              <Users className="h-4 w-4" />
              Directorio de Personas
            </Link>
            <Link
              href="/reglamentos"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-standard border border-white/20"
            >
              <BookOpen className="h-4 w-4" />
              Reglamentos y Actas
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Accesos Principales Operativos (Sin números) ───────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold uppercase tracking-wider text-brand">
            Módulos de Gestión Diario
          </h2>
          <span className="text-[11px] font-semibold text-ink-soft/70">
            Selecciona una categoría para navegar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CategoryCard
            href="/directorio"
            icon={<Users className="h-5 w-5 text-brand" />}
            badge="Comunidad"
            title="Propietarios y Residentes"
            description="Directorio unificado de residentes, arrendatarios, arrendadores y contactos de emergencia."
            cta="Ver directorio"
          />

          <CategoryCard
            href="/areas-privativas"
            icon={<MapPin className="h-5 w-5 text-brand" />}
            badge="Inmuebles"
            title="Áreas Privativas"
            description="Catálogo de lotes, viviendas, locales comerciales y zonas del condominio."
            cta="Ver inmuebles"
          />

          <CategoryCard
            href="/tickets"
            icon={<TicketIcon className="h-5 w-5 text-brand" />}
            badge="Atención"
            title="Solicitudes y Soporte"
            description="Seguimiento de tickets, reportes de mantenimiento y solicitudes de residentes."
            cta="Atender solicitudes"
          />

          <CategoryCard
            href="/reglamentos"
            icon={<BookOpen className="h-5 w-5 text-brand" />}
            badge="Normativa"
            title="Documentos y Reglamentos"
            description="Estatutos condominales, acuerdos de asamblea y normas comunitarias de convivencia."
            cta="Consultar normas"
          />
        </div>
      </div>

      {/* ─── Acciones Frecuentes de Administración ──────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-base font-bold uppercase tracking-wider px-1 text-brand">
          Acciones Frecuentes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            href="/reporte-condominio"
            icon={<FileText className="h-4 w-4 text-white" />}
            title="Generar Ficha de Condominio"
            description="Descarga el estado actual y la ficha técnica del condominio en formato PDF."
            cta="Generar PDF"
          />

          <QuickActionCard
            href="/cobros-masivos"
            icon={<Zap className="h-4 w-4 text-white" />}
            title="Proceso de Cobros Masivos"
            description="Emisión masiva de cuotas ordinarias y extraordinarias para las áreas privativas."
            cta="Iniciar cobros"
          />

          <QuickActionCard
            href="/notificaciones"
            icon={<Bell className="h-4 w-4 text-white" />}
            title="Redactar Comunicado"
            description="Envía avisos de interés general a los residentes vía correo o notificación del portal."
            cta="Redactar aviso"
          />
        </div>
      </div>

      {/* ─── Banner Cálido de Redirección a Análisis y Finanzas ─────────────── */}
      <div className="p-6 rounded-2xl border transition-all bg-gradient-to-r from-canvas-2 via-card to-canvas-2 border-line/70 shadow-sm text-ink">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0 border border-brand/20">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-brand tracking-tight">
                ¿Deseas consultar cifras financieras o métricas del condominio?
              </h3>
              <p className="text-xs text-ink-soft/85 leading-relaxed max-w-2xl">
                Para mantener este portal enfocado en la bienvenida y gestión operativa del día a día, las gráficas comparativas, los balances de cobranza e indicadores de ocupación han sido organizados en sus secciones especializadas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/resumen-financiero"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white font-bold text-xs hover:bg-brand-deep transition-standard shadow-xs"
            >
              <PieChart className="h-4 w-4" />
              Resumen Financiero
            </Link>
            <Link
              href="/estadisticas"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-mint/40 text-brand-deep font-bold text-xs hover:bg-brand-mint transition-standard border border-brand/20"
            >
              <BarChart3 className="h-4 w-4 text-brand" />
              Ver Estadísticas
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes Locales ──────────────────────────────────────────────────

function CategoryCard({
  href,
  icon,
  badge,
  title,
  description,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="p-5 h-full transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-md cursor-pointer flex flex-col justify-between border">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-brand/10 border border-brand/15 group-hover:bg-brand group-hover:text-white transition-colors">
              {icon}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-canvas-2 text-ink-soft/70 border border-line/50">
              {badge}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-ink group-hover:text-brand transition-colors">
              {title}
            </h3>
            <p className="text-xs text-ink-soft/80 leading-relaxed mt-1">
              {description}
            </p>
          </div>
        </div>

        <div className="pt-4 mt-2 border-t border-line/40 flex items-center text-xs font-bold text-brand group-hover:translate-x-0.5 transition-transform">
          <span>{cta}</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Card>
    </Link>
  );
}

function QuickActionCard({
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
      <Card className="p-5 h-full transition-all duration-200 hover:shadow-md hover:border-brand/30 cursor-pointer flex flex-col justify-between border">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-deep text-white shrink-0 group-hover:bg-brand transition-colors">
              {icon}
            </span>
            <h3 className="text-xs font-bold text-brand tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-xs text-ink-soft/80 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-4 mt-3">
          <span className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-brand-deep text-white text-[10px] font-bold uppercase tracking-tight shadow-xs group-hover:bg-brand transition-colors">
            <ArrowRight className="h-3 w-3" /> {cta}
          </span>
        </div>
      </Card>
    </Link>
  );
}
