"use client";

/**
 * Datos del condómino autenticado, resueltos en el servidor por el layout del portal y
 * expuestos a los componentes cliente. Sustituye al usuario/token que el minisitio guardaba
 * en sessionStorage: ya no hay token en el navegador (la sesión es una cookie httpOnly).
 */
import { createContext, useContext } from "react";
import type { MinisitioSessionInfo, MinisitioUser, MinisitioUserType } from "@/modules/minisitio/domain/types";

const MinisitioSessionContext = createContext<MinisitioSessionInfo | null>(null);

export function MinisitioSessionProvider({
  session,
  children,
}: {
  session: MinisitioSessionInfo;
  children: React.ReactNode;
}) {
  return <MinisitioSessionContext.Provider value={session}>{children}</MinisitioSessionContext.Provider>;
}

export interface MinisitioSessionState {
  user: MinisitioUser | null;
  userType: MinisitioUserType | null;
  isAuthenticated: boolean;
  hasPropiedades: boolean;
  hasComerciosArrendamientos: boolean;
}

/** Sesión del condómino. Fuera del portal (login, superadmin) devuelve un estado vacío. */
export function useMinisitioSession(): MinisitioSessionState {
  const session = useContext(MinisitioSessionContext);
  return {
    user: session?.user ?? null,
    userType: session?.user.userType ?? null,
    isAuthenticated: Boolean(session),
    hasPropiedades: session?.userIndicators.hasPropiedades ?? false,
    hasComerciosArrendamientos: session?.userIndicators.hasComerciosArrendamientos ?? false,
  };
}
