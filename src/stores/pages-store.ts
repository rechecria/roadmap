import { create } from 'zustand';
import type { Page } from '@/types/database';

interface SidebarPage {
  id: string;
  title: string;
  icon: string;
  parentId: string | null;
  children: SidebarPage[];
}

interface PagesState {
  pages: Record<string, Page>;
  currentPageId: string | null;
  sidebarPages: SidebarPage[];
  setPages: (pages: Record<string, Page>) => void;
  addPage: (page: Page) => void;
  updatePage: (id: string, updates: Partial<Page>) => void;
  deletePage: (id: string) => void;
  setCurrentPageId: (id: string | null) => void;
  setSidebarPages: (pages: SidebarPage[]) => void;
}

export const usePagesStore = create<PagesState>((set) => ({
  pages: {},
  currentPageId: null,
  sidebarPages: [],
  setPages: (pages) =>
    set({ pages }),
  addPage: (page) =>
    set((state) => ({
      pages: { ...state.pages, [page.id]: page },
    })),
  updatePage: (id, updates) =>
    set((state) => ({
      pages: {
        ...state.pages,
        [id]: { ...state.pages[id], ...updates },
      },
    })),
  deletePage: (id) =>
    set((state) => {
      const { [id]: _, ...remaining } = state.pages;
      return { pages: remaining };
    }),
  setCurrentPageId: (id) =>
    set({ currentPageId: id }),
  setSidebarPages: (pages) =>
    set({ sidebarPages: pages }),
}));
