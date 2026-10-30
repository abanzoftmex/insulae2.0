"use client";

/**
 * Diálogo con las medidas del modal de Slack: 520 px, radio 8, encabezado de 70 px (20 × 28),
 * contenido con 28 px a los lados (16 en el celular) y pie con las acciones a la derecha. Entra
 * de .95 a 1 en 80 ms sobre un velo. En el celular ocupa la pantalla.
 *
 * Atrapa el foco, Esc cierra y el foco vuelve a donde estaba. Con `dismissible={false}` no hay X
 * y ni Esc ni el velo lo cierran: hay que elegir una de las acciones (aceptar el aviso de
 * privacidad o salir, por ejemplo).
 */
import { useEffect, useEffectEvent, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { dialog, scrim } from "../motion";

const noopSubscribe = () => () => {};
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  dismissible = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Acciones (a la derecha). Si el contenido es un <form>, los botones pueden ir dentro. */
  footer?: React.ReactNode;
  /** false: sin X, Esc ni clic en el velo. */
  dismissible?: boolean;
  children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // Fuera de las dependencias del efecto: onClose suele cambiar en cada render del dueño (p. ej. al
  // escribir en un campo cuyo estado vive afuera) y reiniciarlo mandaba el foco al primer campo.
  const closeOnEscape = useEffectEvent(() => {
    if (dismissible) onClose();
  });

  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Primer campo; si no hay, el diálogo.
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>("input, select, textarea");
      (first ?? panelRef.current)?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeOnEscape();
      } else if (e.key === "Tab" && panelRef.current) {
        const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
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

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center sm:p-6">
          <motion.div {...scrim} aria-hidden className="absolute inset-0 bg-chrome-strong/60" onClick={dismissible ? onClose : undefined} />
          <motion.div
            {...dialog}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className="relative flex h-full w-full flex-col bg-surface pt-[env(safe-area-inset-top)] shadow-modal outline-none sm:h-auto sm:max-h-[calc(100dvh-48px)] sm:max-w-[520px] sm:rounded-panel sm:pt-0"
          >
            <div className="flex min-h-[70px] shrink-0 items-start gap-3 px-4 pt-5 pb-3 sm:px-7">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-[22px] leading-[30px] font-bold tracking-[-0.015em] text-fg">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="mt-0.5 text-body text-fg-3">
                    {description}
                  </p>
                )}
              </div>
              {dismissible && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  title="Cerrar (Esc)"
                  className="-mt-0.5 -mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-panel text-fg-2 outline-none hover:bg-surface-3 active:bg-surface-4 focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 sm:px-7">{children}</div>
            {footer && (
              <div className="flex shrink-0 flex-wrap justify-end gap-2 px-4 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))] sm:px-7 sm:pb-6">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
