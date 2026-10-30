/**
 * Botones del portal con las medidas de Slack: chico 28 px (radio 4, 13 px) y mediano 36 px
 * (radio 8). El primario es el olivo de la marca; el hover suma una sombra corta y el presionado
 * oscurece sin encoger el botón. Clases (no componente) para usarlas en <Link>, <a> o <button>.
 */
type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 font-semibold whitespace-nowrap outline-none transition-[background-color,box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const SIZE: Record<Size, string> = {
  sm: "h-7 min-w-14 rounded-ctrl px-3 text-[13px]",
  md: "h-9 min-w-20 rounded-panel px-3 text-body",
};

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover hover:shadow-button active:bg-brand-deep active:shadow-none",
  outline: "border border-stroke-button bg-surface text-fg hover:bg-surface-2 hover:shadow-button active:bg-surface-3 active:shadow-none",
  ghost: "text-brand hover:bg-surface-3 active:bg-surface-4",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${extra}`.trim();
}
