"use client";

/**
 * Diálogo centrado del portal (formularios cortos: solicitar ayuda, enviar por correo…). Entra
 * con un fundido y una escala mínima, se cierra con Esc, con el velo o con la X; el tabulador
 * no sale del diálogo, la página de atrás no se desplaza y al cerrar el foco vuelve a lo que lo
 * abrió. Va en un portal al <body> (ver ui/side-panel.tsx).
 *
 * También exporta `Toast`, el aviso breve de éxito o error que aparece arriba a la derecha.
 */
import { useEffect, useEffectEvent, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sinSuscripcion = () => () => {};
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Campos de formulario del portal (input, select y textarea comparten medidas y estados). */
export const FIELD =
  "w-full rounded-xl border border-stroke-2 bg-card px-3.5 py-2.5 text-[14px] text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-4 hover:border-stroke focus:border-brand/50 focus:ring-[3px] focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-surface-3";
export const LABEL = "mb-1.5 block text-[13px] font-semibold text-fg-2";

export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  tone = "brand",
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Color del ícono de la cabecera. */
  tone?: "brand" | "gold";
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const cerrar = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;
    const previo = document.activeElement as HTMLElement | null;
    const barra = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = "hidden";
    if (barra > 0) document.body.style.paddingRight = `${barra}px`;
    // Primer campo del formulario, o el diálogo mismo si no hay ninguno.
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>("input, select, textarea") ?? panelRef.current;
      first?.focus({ preventScroll: true });
    });

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
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-brand-deep/45 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.18, ease: "linear" } }}
            exit={{ opacity: 0, transition: { duration: 0.14, ease: "linear" } }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-card shadow-[0_0_0_1px_rgb(61_60_34/0.08),0_24px_64px_-12px_rgb(61_60_34/0.4)] outline-none sm:rounded-2xl ${
              size === "lg" ? "sm:max-w-xl" : "sm:max-w-md"
            }`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: reduce ? 0.12 : 0.22, ease: EASE_OUT } }}
            exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
          >
            <div className="flex shrink-0 items-start gap-3 border-b border-stroke-3 px-5 py-4 sm:px-6">
              {Icon && (
                <span
                  className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    tone === "gold" ? "bg-gold-soft text-warning ring-1 ring-inset ring-brand-accent/25" : "bg-brand/[0.08] text-brand"
                  }`}
                >
                  <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-[17px] font-semibold leading-6 text-fg">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-0.5 text-[13px] leading-5 text-fg-3">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-1.5 -mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-3 outline-none transition-colors duration-100 hover:bg-surface-3 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand/45"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Aviso breve arriba a la derecha (éxito o error). Se anuncia a lectores de pantalla. */
export function Toast({ message, tone, onClose }: { message: string; tone: "success" | "error"; onClose?: () => void }) {
  const mounted = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const reduce = useReducedMotion();
  if (!mounted) return null;
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return createPortal(
    <AnimatePresence>
      {message && (
        <motion.div
          role={tone === "error" ? "alert" : "status"}
          className="fixed right-4 top-4 z-[90] flex w-[min(420px,calc(100vw-2rem))] items-start gap-3 rounded-xl bg-card px-4 py-3.5 shadow-[0_0_0_1px_rgb(61_60_34/0.1),0_12px_32px_-10px_rgb(61_60_34/0.35)]"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: EASE_OUT } }}
          exit={{ opacity: 0, y: reduce ? 0 : -6, transition: { duration: 0.15 } }}
        >
          <Icon aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${tone === "success" ? "text-success" : "text-overdue"}`} strokeWidth={2} />
          <p className="min-w-0 flex-1 text-[13.5px] leading-5 text-fg">{message}</p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar aviso"
              className="-mr-1 -mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-3 outline-none hover:bg-surface-3 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand/45"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
