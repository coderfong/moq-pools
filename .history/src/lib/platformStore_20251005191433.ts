// Stub replacement for deprecated zustand-based platform store.
// The original implementation imported 'zustand', which has been removed.
// This file intentionally exports a no-op hook for backward compatibility
// with any stale compiled references until caches are cleared.

export type LegacyPlatformState = { platform: string; setPlatform: (p: string) => void };

export function usePlatformStore(): LegacyPlatformState {
	return { platform: 'ALL', setPlatform: () => {} };
}

// Also provide a default export shape in case of default import usage.
export default { usePlatformStore };
