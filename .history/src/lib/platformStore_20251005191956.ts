// Legacy compatibility shim. Original implementation used 'zustand'.
// We provide a minimal in-memory implementation backed by a simple closure.
// Prefer using PlatformContext (platformContext.tsx) going forward.
export type Platform = 'ALL' | 'ALIBABA' | 'C1688' | 'MADE_IN_CHINA' | 'INDIAMART';

interface PlatformState {
	platform: Platform;
	setPlatform: (p: Platform) => void;
}

// Tiny self-contained store (NOT reactive like Zustand; legacy shim only)
function createPlatformStore() {
	let state: PlatformState = {
		platform: 'ALL',
		setPlatform: (p: Platform) => { state = { ...state, platform: p }; },
	};
	return () => state;
}

export const usePlatformStore = createPlatformStore();
export default usePlatformStore;
