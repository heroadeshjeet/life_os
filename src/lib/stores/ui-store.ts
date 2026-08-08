/**
 * Life_OS v2 — UI store (Zustand).
 *
 * Tracks active module, sidebar collapsed state, focus mode toggle, etc.
 */
"use client";

import { create } from "zustand";

interface UIState {
  activeModule: string;
  sidebarCollapsed: boolean;
  focusMode: boolean;

  setActiveModule: (id: string) => void;
  toggleSidebar: () => void;
  setFocusMode: (on: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModule: "dashboard",
  sidebarCollapsed: false,
  focusMode: false,

  setActiveModule: (id) => set({ activeModule: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setFocusMode: (on) => set({ focusMode: on }),
}));
