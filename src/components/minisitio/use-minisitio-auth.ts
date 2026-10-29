"use client";

/**
 * Sustituto de `useAuthStore()` / `useAuthSimple` del minisitio: combina la sesión que manda
 * el servidor (usuario, tipo, indicadores) con el store de cliente (preferencias y caché de
 * listados). Las pantallas portadas lo desestructuran igual que antes:
 *
 *   const { user, userType, propiedades, setPropiedades } = useMinisitioAuth();
 *
 * Ya no existen `token`, `verifyToken` ni `login`: la sesión es una cookie httpOnly.
 */
import { useMinisitioStore } from "@/stores/minisitio.store";
import { useMinisitioSession } from "./session-provider";

export function useMinisitioAuth() {
  const session = useMinisitioSession();
  const store = useMinisitioStore();
  return { ...store, ...session };
}

/** Equivalente de `useRequireAuth()` de hooks/useAuthSimple.js (el layout ya verificó la sesión). */
export function useRequireAuth() {
  const { user, isAuthenticated, userType } = useMinisitioSession();
  return { user, isAuthenticated, userType, isLoading: false };
}
