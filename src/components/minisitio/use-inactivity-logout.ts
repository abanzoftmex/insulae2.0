"use client";

import { useEffect } from "react";
import { useMinisitioStore } from "@/stores/minisitio.store";
import { msPath } from "./paths";

const INACTIVITY_TIME = 30 * 60 * 1000; // 30 minutos

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keypress",
  "keydown",
  "scroll",
  "touchstart",
  "touchmove",
  "click",
  "wheel",
] as const;

/**
 * Cierra la sesión del condómino tras 30 minutos sin actividad (mouse, teclado, touch o
 * scroll) y lo manda al login con el aviso correspondiente. El cierre al cerrar el navegador
 * lo da la propia cookie de sesión (sin Max-Age).
 */
export function useInactivityLogout() {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleLogout = () => {
      useMinisitioStore.getState().clearData();
      // La ruta borra la cookie httpOnly y redirige a /minisitio/login?reason=inactivity.
      window.location.href = msPath("/logout?reason=inactivity");
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, INACTIVITY_TIME);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, []);
}
