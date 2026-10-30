"use client";

/**
 * Título y breadcrumbs del encabezado del portal (antes `store/layoutStore.js`).
 *
 * Cada ruta tiene un título por defecto (ver MINISITIO_ROUTE_TITLES en el shell); una
 * página solo llama a `setPageData` cuando su título depende de datos (p. ej. el nombre de
 * la propiedad). El override queda ligado a la ruta en la que se fijó, así que nunca se
 * "arrastra" a la siguiente pantalla.
 *
 * `secondaryOpen`: hay una vista secundaria abierta (SecondaryView); en escritorio el shell le
 * hace lugar al panel de contenido, como el panel de hilo de Slack.
 */
import { create } from "zustand";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageOverride {
  pathname: string;
  title: string;
  breadcrumbs: Breadcrumb[];
}

interface MinisitioLayoutState {
  override: PageOverride | null;
  setPageData: (data: { title: string; breadcrumbs?: Breadcrumb[] }) => void;
  setPageTitle: (title: string) => void;
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  resetLayout: () => void;
  secondaryOpen: boolean;
  setSecondaryOpen: (open: boolean) => void;
}

function currentPathname(): string {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

export const useMinisitioLayoutStore = create<MinisitioLayoutState>((set, get) => ({
  override: null,
  setPageData: ({ title, breadcrumbs }) =>
    set({ override: { pathname: currentPathname(), title, breadcrumbs: breadcrumbs || [] } }),
  setPageTitle: (title) => {
    const pathname = currentPathname();
    const prev = get().override;
    set({ override: { pathname, title, breadcrumbs: prev?.pathname === pathname ? prev.breadcrumbs : [] } });
  },
  setBreadcrumbs: (breadcrumbs) => {
    const pathname = currentPathname();
    const prev = get().override;
    set({ override: { pathname, title: prev?.pathname === pathname ? prev.title : "", breadcrumbs } });
  },
  resetLayout: () => set({ override: null }),
  secondaryOpen: false,
  setSecondaryOpen: (open) => set((s) => (s.secondaryOpen === open ? s : { secondaryOpen: open })),
}));
