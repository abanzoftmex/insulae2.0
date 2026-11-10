import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  MapPin,
  Ticket as TicketIcon,
  ArrowRight,
  BookOpen,
} from "lucide-react";

import { getCondominiumOverviewUseCase } from "@/modules/condominium";
import { Card } from "@/components/ui/card";
import { LiveClock } from "@/components/ui/live-clock";
import { getUserPermissions, readAdminSession } from "@/shared/application/auth/permissions";
import { MODULES, type ModuleName } from "@/shared/application/auth/modules";

export const metadata: Metadata = {
  title: "Inicio | Val'Quirico",
  description: "Bienvenida y accesos principales a la gestión operativa del condominio.",
};

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/Mexico_City";

function extractFirstName(fullName?: string | null): string | null {
  const cleaned = fullName?.trim();
  if (!cleaned) return null;
  const [first] = cleaned.split(/\s+/);
  return first || null;
}

// Cada acceso declara el módulo que lo respalda: solo se muestra si el rol puede consultarlo.
type CategoryCardDef = {
  module: ModuleName;
  href: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
  cta: string;
};

const CATEGORY_CARDS: CategoryCardDef[] = [
  {
    module: MODULES.DIRECTORIO,
    href: "/directorio",
    icon: <Users className="h-[18px] w-[18px] text-white" strokeWidth={1.75} />,
    badge: "Comunidad",
    title: "Propietarios y Residentes",
    description: "Directorio unificado de residentes, arrendatarios, arrendadores y contactos de emergencia.",
    cta: "Ver directorio",
  },
  {
    module: MODULES.AREAS_PRIVATIVAS,
    href: "/areas-privativas",
    icon: <MapPin className="h-[18px] w-[18px] text-white" strokeWidth={1.75} />,
    badge: "Inmuebles",
    title: "Áreas Privativas",
    description: "Catálogo de lotes, viviendas, locales comerciales y zonas del condominio.",
    cta: "Ver inmuebles",
  },
  {
    module: MODULES.TICKETS,
    href: "/tickets",
    icon: <TicketIcon className="h-[18px] w-[18px] text-white" strokeWidth={1.75} />,
    badge: "Atención",
    title: "Solicitudes y Soporte",
    description: "Seguimiento de tickets, reportes de mantenimiento y solicitudes de residentes.",
    cta: "Atender solicitudes",
  },
  {
    module: MODULES.REGLAMENTOS,
    href: "/reglamentos",
    icon: <BookOpen className="h-[18px] w-[18px] text-white" strokeWidth={1.75} />,
    badge: "Normativa",
    title: "Documentos y Reglamentos",
    description: "Estatutos condominales, acuerdos de asamblea y normas comunitarias de convivencia.",
    cta: "Consultar normas",
  },
];

export default async function Home() {
  const now = new Date();
  const [session, permissions, condominiumOverview] = await Promise.all([
    readAdminSession(),
    getUserPermissions(),
    getCondominiumOverviewUseCase.execute(),
  ]);

  const userFirstName = extractFirstName(session?.name);
  const canRead = (module: ModuleName) => permissions[module]?.canRead === true;
  const categoryCards = CATEGORY_CARDS.filter((card) => canRead(card.module));
  const condominiumName = condominiumOverview?.condominiumName?.trim() || "Val'Quirico";

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
    <div className="space-y-8 pb-20 sm:pb-12">
      {/* ─── Banner Principal de Bienvenida ───────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#283e48] via-[#304854] to-[#273d47] px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9 text-white shadow-lg border border-black/15">
        {/* Emblema circular Insulae libre en el extremo derecho */}
        <svg
          aria-hidden="true"
          viewBox="8 9 60 60"
          className="pointer-events-none select-none absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 h-[175px] w-[175px] xl:h-[210px] xl:w-[210px] text-white opacity-[0.06] hidden md:block"
          fill="currentColor"
        >
          <path d="M37.92,11.85c-15.17,0-27.51,12.34-27.51,27.51s12.34,27.51,27.51,27.51,27.51-12.34,27.51-27.51-12.34-27.51-27.51-27.51ZM64.17,39.36c0,14.48-11.78,26.25-26.25,26.25s-26.25-11.78-26.25-26.25,11.78-26.25,26.25-26.25,26.25,11.78,26.25,26.25Z" />
          <path d="M37.92,15.02c-13.42,0-24.34,10.92-24.34,24.34s10.92,24.34,24.34,24.34,24.34-10.92,24.34-24.34-10.92-24.34-24.34-24.34ZM61.32,39.36c0,12.9-10.5,23.4-23.4,23.4s-23.4-10.5-23.4-23.4,10.5-23.4,23.4-23.4,23.4,10.5,23.4,23.4Z" />
          <polygon points="32.41 24.23 28.18 23.09 28.18 22.16 47.65 22.16 47.65 23.09 43.42 24.23 32.41 24.23" />
          <polygon points="43.42 54.5 47.65 55.63 47.65 56.57 28.18 56.57 28.18 55.63 32.41 54.5 43.42 54.5" />
          <polygon points="54.19 29.63 53.05 33.86 53.05 44.87 54.19 49.1 55.13 49.1 55.13 29.63 54.19 29.63" />
          <polygon points="20.71 29.63 20.71 49.1 21.65 49.1 22.79 44.87 22.79 33.86 21.65 29.63 20.71 29.63" />
          <rect x="36.58" y="25.37" width="2.3" height="7.62" />
          <rect x="32.3" y="45.93" width="2.3" height="7.43" />
          <path d="M43.15,25.37h-2.3v8.66h-6.25v-8.66h-2.3v8.66h-8.37v2.3h8.37v1.97h-8.37v2.3h8.37v1.97h-8.37v2.3h12.65v8.48h2.3v-8.48h13.04v-2.3h-8.76v-1.97h8.76v-2.3h-8.76v-1.97h8.76v-2.3h-8.76v-8.66ZM34.6,36.33h1.97v1.97h-1.97v-1.97ZM34.6,42.58v-1.97h1.97v1.97h-1.97ZM40.85,42.58h-1.97v-1.97h1.97v1.97ZM40.85,38.3h-1.97v-1.97h1.97v1.97Z" />
          <rect x="40.85" y="45.94" width="2.3" height="7.41" />
          <circle cx="37.88" cy="19.1" r="1.03" />
          <circle cx="17.68" cy="39.61" r="1.09" />
          <circle cx="58.21" cy="39.6" r="1.03" />
          <circle cx="37.84" cy="59.62" r="1.03" />
        </svg>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
          <div className="space-y-3 lg:max-w-[440px] xl:max-w-[480px] shrink-0">
            <h1 className="tracking-tight text-white">
              <span className="block text-3xl sm:text-[36px] lg:text-[40px] font-extrabold leading-[1.08]">
                {userFirstName ? `Bienvenido ${userFirstName}` : "Bienvenido"}
              </span>
              <span className="mt-1 block text-xl sm:text-[24px] lg:text-[27px] font-bold leading-snug text-white/95">
                al condominio{" "}
                <span className="text-[#d0b685]">{condominiumName}</span>
              </span>
            </h1>

            <p className="max-w-[50ch] text-[13px] sm:text-sm font-normal leading-relaxed text-white/80">
              Insulae ordena cada área privativa, las finanzas, las asambleas y los comunicados del desarrollo condominal.
            </p>

            <div className="pt-2 text-[10.5px] sm:text-[11px] font-semibold text-white/65 uppercase tracking-[0.14em] flex items-center gap-2">
              <LiveClock initialDate={initialDate} initialTime={initialTime} />
            </div>
          </div>

          {/* Tarjeta translúcida centrada y separada del borde derecho para liberar el emblema */}
          <div className="flex-1 flex items-center justify-center lg:pr-16 xl:pr-40 2xl:pr-48 min-w-0">
            <div className="flex items-center justify-center rounded-2xl bg-[#243943]/75 backdrop-blur-sm border border-white/15 px-5 py-4 sm:px-7 sm:py-5 shadow-md w-full max-w-[390px] lg:w-auto lg:min-w-[320px] xl:min-w-[350px]">
              <div className="flex items-center justify-center gap-5 sm:gap-7 w-full">
                <div className="flex flex-1 items-center justify-center min-w-0">
                  <Image
                    src="/brand/valquirico-stacked-gold.png"
                    alt="Val'Quirico"
                    width={787}
                    height={423}
                    priority
                    unoptimized
                    className="h-[62px] sm:h-[76px] w-auto object-contain drop-shadow-xs"
                  />
                </div>
                <div className="h-12 sm:h-16 w-px bg-white/20 shrink-0" />
                <div className="flex flex-1 items-center justify-center min-w-0">
                  <Image
                    src="/brand/reinos-de-mexico-logo-c.png"
                    alt="Reinos de México"
                    width={807}
                    height={548}
                    priority
                    className="h-[56px] sm:h-[70px] w-auto object-contain brightness-0 invert opacity-90 drop-shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Franja inferior bicolor dorado-beige */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[3px]">
          <div className="w-[34%] bg-[#d0b685]" />
          <div className="flex-1 bg-[#d0b685]/25" />
        </div>
      </section>

      {/* ─── Accesos Principales Operativos (solo módulos con permiso) ──────── */}
      {categoryCards.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-0.5">
            <div className="flex items-center gap-2.5">
              <span className="h-[2px] w-4 rounded-full bg-[#d0b685] shrink-0" />
              <h2 className="text-[13px] sm:text-sm font-extrabold uppercase tracking-[0.12em] text-[#304854]">
                Módulos de Gestión Diario
              </h2>
            </div>
            <span className="text-[11px] font-medium text-[#304854]/65">
              Selecciona una categoría para navegar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryCards.map((card) => (
              <CategoryCard key={card.href} {...card} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Marca Institucional Insulae ────────────────────────────────────── */}
      <footer className="pt-6 pb-2 flex items-center justify-center">
        <Image
          src="/images/logo_insulae.svg"
          alt="Insulae Servicios Condominales"
          width={227}
          height={78}
          unoptimized
          className="h-24 sm:h-28 lg:h-36 w-auto max-w-[85vw] object-contain"
        />
      </footer>
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
}: Omit<CategoryCardDef, "module">) {
  return (
    <Link href={href} className="block group h-full">
      <Card className="relative overflow-hidden p-5 h-full rounded-2xl bg-white border border-black/[0.06] shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d0b685]/70 hover:shadow-[0_10px_24px_rgba(48,72,84,0.09)] cursor-pointer flex flex-col justify-between">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#d0b685] via-[#dec696] to-[#d0b685]/60" />

        <div className="space-y-3.5 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-[#304854] group-hover:bg-[#1f2f37] transition-colors shadow-xs shrink-0">
              {icon}
            </span>
            <span className="inline-flex items-center rounded-full bg-[#faf5e8] px-3 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[#7a643d] border border-[#d0b685]/45 shrink-0">
              {badge}
            </span>
          </div>

          <div>
            <h3 className="text-[14px] font-extrabold text-[#1f2f37] group-hover:text-[#304854] transition-colors tracking-tight">
              {title}
            </h3>
            <p className="text-[12px] text-[#4b5c66] leading-relaxed mt-1.5">
              {description}
            </p>
          </div>
        </div>

        <div className="pt-3.5 mt-4 border-t border-black/[0.06] flex items-center text-[12px] font-bold text-[#304854]">
          <span>{cta}</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
        </div>
      </Card>
    </Link>
  );
}
