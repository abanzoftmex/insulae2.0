"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/utils/cn";

export interface SectionLink {
  id: string;
  label: string;
  accent: string;
}

/**
 * Navegación por secciones con resaltado de la que está en pantalla.
 * El dashboard es largo; sin este índice el usuario pierde la referencia.
 */
export function SectionNav({ sections }: { sections: SectionLink[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      // El margen superior descuenta la barra sticky para que la sección
      // marque como activa justo cuando su encabezado queda debajo de ella.
      { rootMargin: "-88px 0px -55% 0px", threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  const goTo = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Secciones del dashboard"
    >
      {sections.map((section) => {
        const isActive = activeId === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => goTo(section.id)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "relative shrink-0 px-3 h-8 rounded-lg text-[12px] font-semibold transition-standard whitespace-nowrap",
              isActive ? "text-ink bg-canvas-2" : "text-ink-soft/80 hover:text-ink hover:bg-canvas-2/60",
            )}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle transition-opacity"
              style={{ backgroundColor: section.accent, opacity: isActive ? 1 : 0.35 }}
            />
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
