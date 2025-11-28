"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompareItem {
  id: string;
  title: string;
  image?: string;
  url: string;
  price?: string;
  moq?: string;
  platform?: string;
  supplier?: string;
  description?: string;
}

interface CompareStore {
  items: CompareItem[];
  addItem: (item: CompareItem) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
  isInCompare: (id: string) => boolean;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const current = get().items;
        if (current.length >= 4) {
          alert('You can only compare up to 4 products at once');
          return;
        }
        if (current.find((i) => i.id === item.id)) {
          return;
        }
        set({ items: [...current, item] });
      },
      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },
      clearAll: () => set({ items: [] }),
      isInCompare: (id) => get().items.some((i) => i.id === id),
    }),
    {
      name: 'product-compare',
    }
  )
);
