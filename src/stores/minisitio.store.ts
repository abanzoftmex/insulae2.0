"use client";

/**
 * Estado de cliente del portal de condóminos (antes `store/authStore.js` del minisitio).
 *
 * Ya NO guarda usuario ni token: la sesión vive en una cookie httpOnly y los datos del
 * condómino llegan del servidor (ver session-provider.tsx). Aquí quedan solo las
 * preferencias de vista y la caché de listados que comparten algunas pantallas. Se
 * persiste en sessionStorage, igual que antes: se borra al cerrar el navegador.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ListView = "table" | "grid";

export interface MinisitioPreferences {
  propiedadesView: ListView;
  arrendamientosView: ListView;
  theme: "light";
  sidebarCollapsed: boolean;
}

interface DashboardDataInput {
  notificaciones?: unknown[];
  saldoPendiente?: number;
  totalPropiedades?: number;
  totalArrendamientos?: number;
  propiedades?: unknown[];
  arrendamientos?: unknown[];
}

export interface MinisitioStoreState {
  propiedades: any[];
  arrendamientos: any[];
  notificaciones: any[];
  saldoPendiente: number;
  totalPropiedades: number;
  totalArrendamientos: number;
  preferences: MinisitioPreferences;

  setPropiedades: (propiedades: any[]) => void;
  setArrendamientos: (arrendamientos: any[]) => void;
  setNotificaciones: (notificaciones: any[]) => void;
  setSaldoPendiente: (saldo: number) => void;
  updateDashboardData: (data: DashboardDataInput) => void;
  setViewPreference: (view: "propiedades" | "arrendamientos", viewType: ListView) => void;
  getViewPreference: (view: "propiedades" | "arrendamientos") => ListView;
  setSidebarCollapsed: (collapsed: boolean) => void;
  getSidebarCollapsed: () => boolean;
  /** Limpia la caché de datos al cerrar sesión (las preferencias se conservan). */
  clearData: () => void;
}

const DEFAULT_PREFERENCES: MinisitioPreferences = {
  propiedadesView: "table",
  arrendamientosView: "grid",
  theme: "light",
  sidebarCollapsed: false,
};

const EMPTY_DATA = {
  propiedades: [],
  arrendamientos: [],
  notificaciones: [],
  saldoPendiente: 0,
  totalPropiedades: 0,
  totalArrendamientos: 0,
};

export const useMinisitioStore = create<MinisitioStoreState>()(
  persist(
    (set, get) => ({
      ...EMPTY_DATA,
      preferences: DEFAULT_PREFERENCES,

      setPropiedades: (propiedades) => set({ propiedades, totalPropiedades: propiedades.length }),
      setArrendamientos: (arrendamientos) => set({ arrendamientos, totalArrendamientos: arrendamientos.length }),
      setNotificaciones: (notificaciones) => set({ notificaciones }),
      setSaldoPendiente: (saldoPendiente) => set({ saldoPendiente }),
      updateDashboardData: (data) =>
        set({
          notificaciones: data.notificaciones || [],
          saldoPendiente: data.saldoPendiente || 0,
          totalPropiedades: data.totalPropiedades || 0,
          totalArrendamientos: data.totalArrendamientos || 0,
          propiedades: data.propiedades || [],
          arrendamientos: data.arrendamientos || [],
        }),
      setViewPreference: (view, viewType) =>
        set((state) => ({ preferences: { ...state.preferences, [`${view}View`]: viewType } })),
      getViewPreference: (view) => get().preferences[`${view}View`] || "table",
      setSidebarCollapsed: (collapsed) =>
        set((state) => ({ preferences: { ...state.preferences, sidebarCollapsed: collapsed } })),
      getSidebarCollapsed: () => get().preferences.sidebarCollapsed || false,
      clearData: () => set(EMPTY_DATA),
    }),
    {
      name: "insulae-minisitio",
      storage: createJSONStorage(() => sessionStorage),
      // Se rehidrata al montar el shell (MinisitioShell): así el primer render del cliente
      // coincide con el HTML del servidor y no hay errores de hidratación.
      skipHydration: true,
      partialize: (state) => ({
        propiedades: state.propiedades,
        arrendamientos: state.arrendamientos,
        notificaciones: state.notificaciones,
        saldoPendiente: state.saldoPendiente,
        totalPropiedades: state.totalPropiedades,
        totalArrendamientos: state.totalArrendamientos,
        preferences: state.preferences,
      }),
    },
  ),
);
