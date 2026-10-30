/**
 * Encabezado olivo de las pantallas con resumen (Panel de Control, Mis Propiedades, Mis
 * Comercios): título, subtítulo, un dato a la derecha y una fila de métricas en tarjetas
 * blancas. Una sola pieza para que las tres pantallas midan y se comporten igual.
 */
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export function PageBanner({
  id,
  title,
  subtitle,
  meta,
  aside,
  children,
}: {
  /** id del título, para `aria-labelledby`. */
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  /** Línea de contexto bajo el subtítulo (última actualización…). */
  meta?: React.ReactNode;
  /** Dato destacado a la derecha (tipo de usuario, total…). */
  aside?: React.ReactNode;
  /** Métricas: van en una rejilla que el llamador define. */
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="relative isolate overflow-hidden rounded-2xl bg-brand-deep p-5 text-white shadow-[0_1px_2px_rgb(61_60_34/0.25),0_16px_40px_-20px_rgb(61_60_34/0.6)] md:p-6 lg:p-7"
    >
      {/* Una luz cálida desde la esquina da profundidad; no es un degradado de borde a borde. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(110%_120%_at_0%_0%,rgb(117_114_66/0.75),transparent_55%),radial-gradient(80%_100%_at_100%_100%,rgb(45_44_24/0.9),transparent_60%)]"
      />
      <div className={`flex flex-wrap items-start justify-between gap-4 ${children ? "mb-6" : ""}`}>
        <div className="min-w-0">
          <h2 id={id} className="text-[24px] font-bold leading-8 tracking-[-0.02em]">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-[14px] leading-5 text-white/75">{subtitle}</p>}
          {meta && <p className="mt-1 text-[13px] leading-5 text-white/65">{meta}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Dato a la derecha del encabezado: ícono en crema, valor y una etiqueta corta. */
export function BannerAside({ icon: Icon, value, label }: { icon: LucideIcon; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.08] py-2.5 pl-3 pr-4 ring-1 ring-inset ring-white/15">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-mint text-brand-deep">
        <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <div>
        <p className="text-[14px] font-semibold leading-5 tabular-nums">{value}</p>
        <p className="text-[12px] leading-4 text-brand-mint/75">{label}</p>
      </div>
    </div>
  );
}

type Tone = "brand" | "gold" | "overdue" | "success";

const ICON_TONE: Record<Tone, string> = {
  brand: "bg-brand/[0.08] text-brand ring-brand/10",
  success: "bg-success-bg text-success ring-success/15",
  gold: "bg-gold-soft text-warning ring-brand-accent/25",
  overdue: "bg-critical-bg text-overdue ring-overdue/15",
};

/** Métrica del encabezado. Con `href` es un acceso: se eleva al pasar el cursor. */
export function BannerMetric({
  icon: Icon,
  value,
  label,
  caption,
  info,
  href,
  tone = "brand",
  valueTone,
  details,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  /** Tercera línea, atenuada (fecha de corte, aclaración). */
  caption?: string;
  /** Algo junto a la etiqueta (p. ej. el botón que explica un cálculo). */
  info?: React.ReactNode;
  href?: string;
  tone?: Tone;
  /** Color del valor cuando significa algo (vencido o al corriente). */
  valueTone?: "overdue" | "success";
  /** Desglose bajo la cifra, separado por una línea (p. ej. superficie e indiviso). */
  details?: React.ReactNode;
}) {
  const body = (
    <>
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${ICON_TONE[tone]}`}>
        <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        {/* La cifra se ajusta al ancho de SU tarjeta (container query), no al de la ventana: en
            cuatro columnas un saldo de ocho cifras no cabía y se cortaba con "…". */}
        <span
          className={`block truncate text-[17px] font-bold leading-7 tracking-[-0.015em] tabular-nums @[17rem]:text-[20px] @[20rem]:text-[22px] ${
            valueTone === "overdue" ? "text-overdue" : valueTone === "success" ? "text-success" : "text-fg"
          }`}
          title={value}
        >
          {value}
        </span>
        <span className="flex items-center gap-1.5 text-[13px] leading-5 text-fg-3">
          {label}
          {info}
        </span>
        {caption && <span className="block text-[12px] leading-4 text-fg-4">{caption}</span>}
        {details && <span className="mt-2.5 block space-y-0.5 border-t border-stroke-3 pt-2.5 text-[12.5px] leading-[18px] text-fg-3">{details}</span>}
      </span>
      {href && (
        <ArrowRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-fg-4 transition-[color,translate] duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-brand"
          strokeWidth={2.25}
        />
      )}
    </>
  );
  const base = `@container flex ${details ? "items-start" : "items-center"} gap-4 rounded-xl bg-card p-4 text-left shadow-[0_1px_2px_rgb(0_0_0/0.12)]`;
  return href ? (
    <Link
      href={href}
      className={`group ${base} outline-none transition-[box-shadow,translate] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgb(0_0_0/0.45)] focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-deep active:translate-y-0 motion-reduce:hover:translate-y-0`}
    >
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}
