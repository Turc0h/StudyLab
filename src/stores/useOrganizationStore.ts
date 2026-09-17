import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrganizationFilter = "all" | "exams" | "deliveries" | "reviews";

interface OrganizationState {
  isOpen: boolean;
  activeFilter: OrganizationFilter;
  openOrganization: () => void;
  closeOrganization: () => void;
  toggleOrganization: () => void;
  setActiveFilter: (filter: OrganizationFilter) => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      isOpen: false,
      activeFilter: "all",
      openOrganization: () => set({ isOpen: true }),
      closeOrganization: () => set({ isOpen: false }),
      toggleOrganization: () => set((s) => ({ isOpen: !s.isOpen })),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
    }),
    {
      name: "studylab-organization-panel",
      partialize: (state) => ({ activeFilter: state.activeFilter }),
    },
  ),
);
