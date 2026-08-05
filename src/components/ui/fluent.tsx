/**
 * Primitivas del plano de contenido — Fluent 2 (Microsoft Teams).
 *
 * Estas NO sustituyen a `components/ui/*` (el sistema olivo tipo Starbucks que
 * viste el rail y los listados). Son la capa del lienzo de trabajo: superficie
 * neutra, hairline visible, radio bajo y color sólo donde el dato es semántico.
 *
 * Tres reglas que hacen que se lea como herramienta y no como dashboard genérico:
 *
 *  1. **El borde define, la sombra no.** Una tarjeta en reposo es blanco + 1px
 *     `--color-stroke-2`. La sombra entra sólo al elevar de verdad.
 *  2. **Sentence case.** Nada de MAYÚSCULAS con `tracking-widest`: la jerarquía
 *     la cargan el peso (400/600) y la rampa de gris, no el espaciado.
 *  3. **El color es información.** El olivo de marca es acento de acción; verde
 *     y rojo sólo cuando el estado lo es. Un estado neutro se pinta neutro.
 */
import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import { cn } from "@/shared/utils/cn";

/* ── Superficie ──────────────────────────────────────────────────────────── */

export function Surface({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-panel border border-stroke-2 bg-surface", className)}
      {...props}
    />
  );
}

/**
 * Cabecera de panel: texto plano sobre la superficie + divisor de pelo.
 * Deliberadamente NO es una banda de color — esa es la marca del dashboard
 * decorativo. La acción secundaria va a la derecha, como el "See all" de Teams.
 */
export function SurfaceHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-stroke-3 px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-[14px] font-semibold leading-5 text-fg">{title}</h2>
        {subtitle && (
          <p className="truncate text-[12px] leading-4 text-fg-3">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Indicador ───────────────────────────────────────────────────────────── */

type Tone = "neutral" | "positive" | "critical" | "brand";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-fg-3",
  positive: "text-success",
  critical: "text-critical",
  brand: "text-brand",
};

/**
 * KPI. El número manda (28px semibold), la etiqueta se retira (12px gris) y el
 * pie sólo se colorea si dice algo semántico. `tabular-nums` mantiene las cifras
 * alineadas entre tarjetas: sin eso una fila de KPIs "baila" al actualizarse.
 */
export function Metric({
  label,
  value,
  footnote,
  tone = "neutral",
  icon,
  className,
}: {
  label: string;
  value: string;
  footnote?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-panel border border-stroke-2 bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] leading-4 text-fg-3">{label}</p>
        {icon && <span className="shrink-0 text-fg-4">{icon}</span>}
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-9 tracking-[-0.02em] text-fg tabular-nums">
        {value}
      </p>
      <p className={cn("mt-0.5 text-[12px] leading-4", TONE_TEXT[tone])}>
        {footnote ?? " "}
      </p>
    </div>
  );
}

/* ── Badge ───────────────────────────────────────────────────────────────── */

const BADGE_TONE: Record<Tone, string> = {
  neutral: "bg-surface-4 text-fg-2",
  positive: "bg-success/10 text-success",
  critical: "bg-critical/10 text-critical",
  brand: "bg-brand/10 text-brand",
};

/** Badge tipo Fluent: radio 4px, 20px de alto, tinte suave. Nunca pastilla. */
export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-ctrl px-1.5 text-[12px] font-medium leading-none",
        BADGE_TONE[tone],
      )}
    >
      {children}
    </span>
  );
}

/* ── Tarjeta de módulo ───────────────────────────────────────────────────── */

/**
 * Entrada a un módulo: la tarjeta sí se gana el espacio cuando lleva una
 * descripción que explica qué hay dentro (a diferencia del acceso rápido, que
 * es sólo un destino y va como fila).
 *
 * Diferencias con la versión de la que viene: el icono va en una teja NEUTRA
 * y monocroma en vez de un chip de color por categoría, el badge es un tinte
 * gris de 4px en vez de una pastilla, y el título va en sentence case. La
 * categoría se distingue por la palabra, no por el color — con cuatro tarjetas
 * equivalentes, cuatro colores no informan de nada.
 */
export function ModuleCard({
  href,
  icon,
  badge,
  title,
  description,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  badge?: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-panel border border-stroke-2 bg-surface p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-ctrl bg-surface-3 text-fg-2">
          {icon}
        </span>
        {badge && <StatusBadge>{badge}</StatusBadge>}
      </div>
      <h3 className="mt-3 text-[14px] font-semibold leading-5 text-fg">{title}</h3>
      {/* flex-1 empuja el CTA al fondo: sin esto, tarjetas con descripciones de
          distinto largo dejan los enlaces a alturas distintas en la misma fila. */}
      <p className="mt-1 flex-1 text-[12px] leading-4 text-fg-3">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand">
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/* ── Fila de comando ─────────────────────────────────────────────────────── */

/**
 * Fila de acción al estilo del panel de comandos de Teams: alto fijo, icono
 * monocromo, chevron a la derecha y hover como un lavado neutro. Sustituye a la
 * "tarjeta de acceso rápido" con icono de color, que ocupa 6× más por el mismo dato.
 */
export function ActionRow({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-3 focus-visible:bg-surface-3 focus-visible:outline-none"
    >
      <span className="shrink-0 text-fg-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] leading-5 text-fg">{label}</span>
        {description && (
          <span className="block truncate text-[12px] leading-4 text-fg-3">
            {description}
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-fg-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/* ── Botones ─────────────────────────────────────────────────────────────── */

export function PrimaryLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 shrink-0 items-center gap-2 rounded-ctrl bg-brand px-3 text-[14px] font-semibold leading-none text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {icon}
      {children}
    </Link>
  );
}

/**
 * Acción primaria SOBRE una superficie de marca (el banner). Invierte la
 * relación: superficie blanca, tinta olivo. Un botón olivo sobre fondo olivo no
 * tendría separación, y uno con borde blanco translúcido se lee como
 * deshabilitado.
 */
export function InvertedLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 shrink-0 items-center gap-2 rounded-ctrl bg-surface px-3 text-[14px] font-semibold leading-none text-brand transition-colors hover:bg-brand-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {icon}
      {children}
    </Link>
  );
}

export function SubtleLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-6 items-center rounded-ctrl px-1.5 text-[12px] font-semibold text-brand transition-colors hover:bg-surface-3"
    >
      {children}
    </Link>
  );
}

/* ── Vacío ───────────────────────────────────────────────────────────────── */

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="px-4 py-10 text-center text-[13px] text-fg-3">{message}</p>
  );
}
