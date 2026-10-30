"use client";

/**
 * Panel lateral del portal (detalle de un comunicado y similares). Entra desde la derecha sobre un
 * velo y se cierra con Esc, con el velo o con la X. Mientras está abierto, el tabulador no sale del
 * panel y la página de atrás no se desplaza; al cerrar, el foco vuelve a lo que lo abrió.
 *
 * Va en un portal al <body>: una animación con `transform` en cualquier ancestro convierte a
 * `position: fixed` en relativo a ese ancestro y el panel quedaría recortado.
 */
import { useEffect, useEffectEvent, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sinSuscripcion = () => () => {};

/** Curva de geometría del portal (`--ease-smooth`). */
const EASE_SMOOTH = [0.32, 0.72, 0, 1] as const;

export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Línea bajo el título (categoría, fecha…). */
  subtitle?: string;
  /** Ícono de la cabecera, ya dimensionado (h-5 w-5). */
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  // El portal solo existe en el cliente: en el servidor no hay <body> al cual montarlo.
  const mounted = useSyncExternalStore(sinSuscripcion, () => true, () => false);

  const cerrar = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;
    const previo = document.activeElement as HTMLElement | null;
    // Sin la barra de desplazamiento la página se ensancha: se compensa para que no "salte".
    const barra = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = "hidden";
    if (barra > 0) document.body.style.paddingRight = `${barra}px`;
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const [primero, ultimo] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previo?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-brand-deep/45 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2, ease: "linear" } }}
            exit={{ opacity: 0, transition: { duration: 0.16, ease: "linear" } }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-card shadow-[0_0_0_1px_rgb(61_60_34/0.08),-24px_0_48px_-24px_rgb(61_60_34/0.35)]"
            initial={reduce ? { opacity: 0 } : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1, transition: { duration: reduce ? 0.12 : 0.28, ease: EASE_SMOOTH } }}
            exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { x: 40, opacity: 0, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
          >
            <header className="flex shrink-0 items-start gap-3 bg-brand-deep px-5 py-4 text-white sm:px-6 sm:py-5">
              {icon && (
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-mint">
                  {icon}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-white">
                  {title}
                </h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-white/75">{subtitle}</p>}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Cerrar panel"
                className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/85 outline-none transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
