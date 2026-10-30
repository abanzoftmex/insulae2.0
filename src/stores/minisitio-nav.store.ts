"use client";

/**
 * Secciones plegadas de la barra lateral del portal y hasta qué aviso vio cada condómino (por
 * dispositivo: la BD no guarda lecturas). Se recuerdan en localStorage (no en sessionStorage: es
 * una preferencia, como en Slack). `skipHydration` porque el primer render debe coincidir con
 * el HTML del servidor; el shell rehidrata al montar.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface MinisitioNavState {
  collapsed: Record<string, boolean>;
  toggle: (id: string) => void;
  setAll: (ids: string[], collapsed: boolean) => void;
  expand: (id: string) => void;
  /** Fecha (ISO) del último aviso que vio cada usuario, por id. */
  avisosVistos: Record<string, string>;
  markAvisosVistos: (userId: string, hasta: string) => void;
}

export const useMinisitioNavStore = create<MinisitioNavState>()(
  persist(
    (set) => ({
      collapsed: {},
      toggle: (id) => set((s) => ({ collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } })),
      setAll: (ids, collapsed) => set({ collapsed: Object.fromEntries(ids.map((id) => [id, collapsed])) }),
      expand: (id) => set((s) => (s.collapsed[id] ? { collapsed: { ...s.collapsed, [id]: false } } : s)),
      avisosVistos: {},
      markAvisosVistos: (userId, hasta) =>
        set((s) => (s.avisosVistos[userId] === hasta ? s : { avisosVistos: { ...s.avisosVistos, [userId]: hasta } })),
    }),
    {
      name: "minisitio-nav",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
