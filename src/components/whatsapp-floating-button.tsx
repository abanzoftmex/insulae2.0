"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";

const WHATSAPP_HREF = "https://wa.me/5212212721794?text=Hola,%20necesito%20ayuda";

/**
 * Botón flotante global de soporte por WhatsApp.
 * - Se oculta en rutas de impresión y en /gobernanza/convocatorias (que tiene su propio botón).
 * - Usa z-30 para no superponerse sobre modales o drawers (z-50).
 * - Se compacta a icono circular 44x44 en pantallas pequeñas y se eleva cuando
 *   la ruta actual tiene barra de acciones fija inferior.
 */
export function WhatsAppFloatingButton() {
  const pathname = usePathname();
  const normalizedPath =
    pathname && pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname || "/";

  if (
    normalizedPath.endsWith("/imprimir") ||
    normalizedPath === "/gobernanza/convocatorias"
  ) {
    return null;
  }

  const hasFixedBottomBar = normalizedPath === "/gobernanza/convocatorias/nuevo";

  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="¿Necesitas algo? Contactar por WhatsApp"
      className={cn(
        "fixed z-30 print:hidden flex items-center justify-center rounded-full bg-[#25D366] hover:bg-[#16a34a] text-white",
        "h-11 w-11 p-0 sm:h-auto sm:w-auto sm:gap-2 sm:pl-2.5 sm:pr-3.5 sm:py-2",
        "right-[max(1rem,env(safe-area-inset-right))] sm:right-[max(1.25rem,env(safe-area-inset-right))]",
        hasFixedBottomBar
          ? "bottom-[max(5rem,calc(4.5rem+env(safe-area-inset-bottom)))]"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))]",
        "shadow-[0_8px_24px_rgba(37,211,102,0.35)] hover:shadow-[0_10px_28px_rgba(22,163,74,0.45)]",
        "transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 group"
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 shrink-0">
        <svg
          className="w-4 h-4 sm:w-[18px] sm:h-[18px] fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.511 0 9.992-4.479 9.995-9.996.002-2.653-1.03-5.146-2.908-7.027-1.879-1.881-4.38-2.916-7.037-2.917-5.517 0-10.002 4.48-10.004 9.997-.001 1.714.453 3.39 1.317 4.877L.888 22.09l4.57-1.196c1.472.852 3.023 1.26 4.706 1.26zm10.743-7.466c-.294-.148-1.743-.86-2.012-.958-.269-.098-.465-.148-.66.148-.196.297-.76.958-.93 1.156-.172.196-.343.22-.637.072-.295-.148-1.246-.459-2.373-1.464-.877-.782-1.47-1.747-1.642-2.043-.172-.296-.018-.456.13-.603.133-.132.294-.344.44-.516.148-.171.197-.294.295-.49.098-.197.05-.37-.024-.517-.074-.148-.66-1.592-.906-2.18-.24-.578-.484-.5-.66-.51-.171-.007-.366-.009-.561-.009-.195 0-.514.073-.783.37-.269.296-1.027 1.006-1.027 2.454 0 1.448 1.054 2.846 1.202 3.043.147.197 2.074 3.167 5.025 4.443.702.303 1.25.485 1.678.62.705.224 1.348.193 1.856.117.566-.084 1.743-.712 1.988-1.4.246-.688.246-1.277.172-1.4-.074-.124-.27-.197-.565-.346z" />
        </svg>
      </span>
      <span className="hidden sm:flex flex-col text-left text-[11px] font-bold leading-[1.12]">
        <span>¿Necesitas</span>
        <span>algo?</span>
      </span>
    </a>
  );
}

