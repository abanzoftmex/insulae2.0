"use client";

/**
 * Etiqueta flotante para los íconos del rail colapsado. Aparece al pasar el cursor o al
 * enfocar con el teclado; la primera tarda un poco (no estorba al cruzar el rail), y las
 * siguientes son instantáneas mientras se recorre el menú, como en los menús de macOS.
 *
 * Va en un portal al <body>: el rail tiene `translate`, que convierte a `position: fixed`
 * en relativo al rail. Es solo visual (aria-hidden): el ítem ya lleva su aria-label.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type TooltipPosition = "right" | "bottom";

const DELAY_MS = 380;
const SKIP_DELAY_MS = 500;
let lastHiddenAt = 0;

const sinSuscripcion = () => () => {};

export function Tooltip({
  children,
  title,
  position = "right",
  className = "block",
  style,
  disabled = false,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  position?: TooltipPosition;
  /** Clases del contenedor. */
  className?: string;
  style?: React.CSSProperties;
  /** Sin tooltip (p. ej. con el rail expandido, donde la etiqueta ya se ve). */
  disabled?: boolean;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mounted = useSyncExternalStore(sinSuscripcion, () => true, () => false);

  const show = () => {
    if (disabled || !triggerRef.current) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos(
        position === "right"
          ? { top: r.top + r.height / 2, left: r.right + 10 }
          : { top: r.bottom + 8, left: r.left + r.width / 2 },
      );
    };
    clearTimeout(timer.current);
    if (Date.now() - lastHiddenAt < SKIP_DELAY_MS) place();
    else timer.current = setTimeout(place, DELAY_MS);
  };

  const hide = () => {
    clearTimeout(timer.current);
    setPos((p) => {
      if (p) lastHiddenAt = Date.now();
      return null;
    });
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <span
      ref={triggerRef}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={(e) => e.target.matches(":focus-visible") && show()}
      onBlur={hide}
      onPointerDown={hide}
      className={className}
      style={style}
    >
      {children}
      {/* Deshabilitado a mitad de un hover (el rail se expande): la etiqueta se va de inmediato. */}
      {mounted &&
        pos &&
        !disabled &&
        createPortal(
          <span
            aria-hidden
            data-side={position}
            className="tooltip-pop pointer-events-none fixed z-[70] whitespace-nowrap rounded-md bg-brand-deep px-2.5 py-1.5 text-[12.5px] font-medium leading-4 text-white shadow-[0_4px_12px_rgb(61_60_34/0.24)]"
            style={{
              top: pos.top,
              left: pos.left,
              translate: position === "right" ? "0 -50%" : "-50% 0",
            }}
          >
            {title}
          </span>,
          document.body,
        )}
    </span>
  );
}

export default Tooltip;
