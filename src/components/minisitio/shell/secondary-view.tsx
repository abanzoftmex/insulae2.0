"use client";

/**
 * Vista secundaria, como el panel de hilo de Slack: el detalle se abre a la derecha sin quitar
 * la lista de la vista (en escritorio el contenido se hace a un lado) y en el celular ocupa la
 * pantalla.
 *
 * En escritorio no es modal: la lista sigue usable y se puede abrir otro elemento. Esc la cierra
 * desde dentro; el foco entra al abrir y vuelve a donde estaba al cerrar.
 */
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import { DUR, EASE } from "../motion";

const DESKTOP_QUERY = "(min-width: 1024px)";
const noopSubscribe = () => () => {};

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function SecondaryView({
  open,
  onClose,
  title,
  context,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Título del encabezado (p. ej. "Aviso"). */
  title: string;
  /** Contexto atenuado junto al título, como el canal junto a "Hilo" en Slack. */
  context?: string;
  /** Fijo abajo, fuera del scroll (p. ej. el compositor de un hilo). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isDesktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => true);
  const setSecondaryOpen = useMinisitioLayoutStore((s) => s.setSecondaryOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    setSecondaryOpen(open);
    return () => setSecondaryOpen(false);
  }, [open, setSecondaryOpen]);

  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => restore?.focus?.();
  }, [open]);

  // En el celular tapa la pantalla: sin scroll detrás.
  useEffect(() => {
    if (!open || isDesktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, isDesktop]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role={isDesktop ? "complementary" : "dialog"}
          aria-modal={isDesktop ? undefined : true}
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onClose();
            }
          }}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0, transition: { duration: DUR.fast, ease: EASE.slack } }}
          exit={{ opacity: 0, x: 24, transition: { duration: DUR.instant, ease: EASE.slack } }}
          className="fixed inset-0 z-50 flex flex-col bg-surface pt-[env(safe-area-inset-top)] outline-none lg:inset-auto lg:top-11 lg:right-1 lg:bottom-1 lg:z-30 lg:w-[400px] lg:rounded-panel lg:pt-0 lg:shadow-panel"
        >
          <header className="flex h-[49px] shrink-0 items-center gap-2 border-b border-stroke-3 pr-2 pl-4">
            <h2 id={titleId} className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="shrink-0 text-[18px] leading-6 font-bold tracking-[-0.012em] text-fg">{title}</span>
              {context && <span className="truncate text-body text-fg-3">{context}</span>}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              title="Cerrar (Esc)"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-ctrl text-fg-2 outline-none hover:bg-surface-3 active:bg-surface-4 focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </header>
          <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 ${footer ? "pb-4" : "pb-[calc(16px+env(safe-area-inset-bottom))]"}`}>{children}</div>
          {footer && <div className="shrink-0 px-4 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]">{footer}</div>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
