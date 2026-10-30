"use client";

/**
 * Pestañas con subrayado, como las de un canal de Slack: 40 px, cifra en caption y un subrayado
 * olivo de 2 px que se desliza con el mismo resorte que la píldora del menú. El contenido va en
 * un elemento con role="tabpanel" que pone la pantalla.
 */
import { motion } from "framer-motion";
import { SPRING } from "../motion";

export interface TabOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export function UnderlineTabs<T extends string>({
  label,
  value,
  onChange,
  options,
  layoutId,
  className = "",
}: {
  /** Nombre del grupo para lectores de pantalla (p. ej. "Mostrar avisos"). */
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: TabOption<T>[];
  /** Único por pantalla, para que el subrayado se deslice entre sus pestañas. */
  layoutId: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={`flex gap-5 ${className}`}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`relative flex h-10 items-center gap-1.5 text-body font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              active ? "text-fg" : "text-fg-3 hover:text-fg"
            }`}
          >
            {option.label}
            {option.count !== undefined && <span className="text-caption font-medium text-fg-3 tabular-nums">{option.count}</span>}
            {active && <motion.span layoutId={layoutId} aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" transition={SPRING.indicator} />}
          </button>
        );
      })}
    </div>
  );
}
