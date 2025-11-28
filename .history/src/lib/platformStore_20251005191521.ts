// Legacy compatibility shim. Original implementation used 'zustand'.
// We provide a minimal in-memory implementation backed by a simple closure.
// Prefer using PlatformContext (platformContext.tsx) going forward.
import { create } from 'zustand';

export type Platform = 'ALL' | 'ALIBABA' | 'C1688' | 'MADE_IN_CHINA' | 'INDIAMART';

interface PlatformState {
	platform: Platform;
	setPlatform: (p: Platform) => void;
}

export const usePlatformStore = create<PlatformState>((set) => ({
	platform: 'ALL',
	setPlatform: (platform: Platform) => set({ platform }),
}));

export default usePlatformStore;
