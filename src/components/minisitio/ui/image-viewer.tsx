"use client";

/**
 * Visor de imagen a pantalla completa, como el de Slack: fondo olivo casi negro, la imagen
 * centrada, "Abrir original" y cerrar. Esc, el botón o un clic fuera de la imagen cierran; el foco
 * vuelve a la miniatura.
 */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { dialog, scrim } from "../motion";

const noopSubscribe = () => () => {};

export interface ViewerImage {
  src: string;
  /** Texto del encabezado y del alt (p. ej. el título del aviso). */
  title: string;
}

export function ImageViewer({ image, onClose }: { image: ViewerImage | null; onClose: () => void }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = image !== null;

  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        // Solo hay dos controles; el foco no sale del visor.
        const controls = Array.from(document.querySelectorAll<HTMLElement>("[data-image-viewer] a, [data-image-viewer] button"));
        const index = controls.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        controls[(index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      restore?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {image && (
        <motion.div
          {...scrim}
          data-image-viewer
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen: ${image.title}`}
          className="fixed inset-0 z-[60] flex flex-col bg-chrome-strong/95 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex h-14 shrink-0 items-center gap-2 pr-2 pl-4 text-chrome-ink">
            <p className="min-w-0 flex-1 truncate text-body font-semibold">{image.title}</p>
            <a
              href={image.src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-ctrl px-2.5 text-[13px] font-semibold text-chrome-ink-soft outline-none hover:bg-chrome-hover hover:text-chrome-ink focus-visible:ring-2 focus-visible:ring-chrome-focus"
            >
              Abrir original
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar imagen"
              title="Cerrar (Esc)"
              className="inline-flex h-9 w-9 items-center justify-center rounded-ctrl text-chrome-ink-soft outline-none hover:bg-chrome-hover hover:text-chrome-ink focus-visible:ring-2 focus-visible:ring-chrome-focus"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4" onClick={onClose}>
            <motion.img
              {...dialog}
              src={image.src}
              alt={image.title}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-panel object-contain shadow-modal"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
