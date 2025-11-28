import { create } from 'zustand';

export type Platform = 'ALL' | 'ALIBABA' | 'C1688' | 'MADE_IN_CHINA' | 'INDIAMART';

interface PlatformState {
  platform: Platform;
  setPlatform: (p: Platform) => void;
}

export const usePlatformStore = create<PlatformState>(set => ({
  platform: 'ALL',
  setPlatform: (platform) => set({ platform }),
}));
