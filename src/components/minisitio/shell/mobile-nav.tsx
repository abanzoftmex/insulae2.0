"use client";

/**
 * Navegación del celular, como Slack móvil: barra de pestañas abajo para lo que más se usa y el
 * menú completo en una hoja que entra desde la izquierda.
 */
import { useEffect, useEffectEvent, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Megaphone, Menu, MessageSquareText, X } from "lucide-react";
import { msPath } from "../paths";
import { SPRING, scrim } from "../motion";

const TABS = [
  { id: "inicio", label: "Inicio", href: "/", icon: Home, match: /^\/$/ },
  { id: "avisos", label: "Avisos", href: "/comunicados", icon: Megaphone, match: /^\/comunicados/ },
  { id: "solicitudes", label: "Solicitudes", href: "/tickets", icon: MessageSquareText, match: /^\/tickets/ },
] as const;

export function MobileTabBar({ path, solicitudes, onOpenMenu, menuOpen }: { path: string; solicitudes: number; onOpenMenu: () => void; menuOpen: boolean }) {
  const tabClass = (active: boolean) =>
    `relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-caption font-medium outline-none focus-visible:bg-surface-3 ${
      active ? "text-brand" : "text-fg-3"
    }`;
  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(56px+env(safe-area-inset-bottom))] border-t border-stroke-2 bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.match.test(path);
        const Icon = tab.icon;
        return (
          <Link key={tab.id} href={msPath(tab.href)} aria-current={active ? "page" : undefined} className={tabClass(active)}>
            <span className="relative">
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              {tab.id === "solicitudes" && solicitudes > 0 && (
                <span className="absolute -top-1 -right-2.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-mention px-1 text-[10px] leading-none font-bold text-white tabular-nums">
                  {solicitudes}
                </span>
              )}
            </span>
            {tab.label}
            {tab.id === "solicitudes" && solicitudes > 0 && <span className="sr-only">, {solicitudes} abiertas</span>}
          </Link>
        );
      })}
      <button type="button" onClick={onOpenMenu} aria-expanded={menuOpen} aria-haspopup="dialog" className={tabClass(menuOpen)}>
        <Menu className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
        Menú
      </button>
    </nav>
  );
}

export function MobileSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Fuera de las dependencias: si el dueño se vuelve a pintar, el efecto no se reinicia (ni el foco salta).
  const closeOnEscape = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('a, button')?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeOnEscape();
      } else if (e.key === "Tab" && panelRef.current) {
        // El foco no sale de la hoja.
        const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      restore?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div {...scrim} className="absolute inset-0 bg-chrome-strong/50" onClick={onClose} aria-hidden />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú del portal"
            initial={{ x: "-100%" }}
            animate={{ x: 0, transition: SPRING.drawer }}
            exit={{ x: "-100%", transition: { duration: 0.16, ease: [0.36, 0.19, 0.29, 1] } }}
            className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-chrome pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-modal"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar menú"
              className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-panel text-chrome-ink-soft outline-none hover:bg-chrome-hover focus-visible:ring-2 focus-visible:ring-chrome-focus"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
