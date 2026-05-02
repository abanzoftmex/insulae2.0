import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';

type SidebarState = {
  isCollapsed: boolean;       // desktop preference
  isMobileOpen: boolean;      // transient, NOT persisted
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setCollapsed: (v) => set({ isCollapsed: v }),
      openMobile: () => set({ isMobileOpen: true }),
      closeMobile: () => set({ isMobileOpen: false }),
    }),
    {
      name: 'insulae.ui.sidebar',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    }
  )
);

/**
 * Hook to avoid hydration mismatch when reading from persisted localStorage.
 * Returns the store state only after the component has hydrated.
 */
export function useHydratedSidebar() {
  const [hydrated, setHydrated] = useState(false);
  const store = useSidebarStore();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  return {
    ...store,
    isHydrated: hydrated,
    // Return default values if not hydrated to avoid layout shift on first server render
    isCollapsed: hydrated ? store.isCollapsed : false,
    isMobileOpen: hydrated ? store.isMobileOpen : false,
  };
}
