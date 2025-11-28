// Ambient module declaration to neutralize lingering references to the old zustand-based platformStore.
declare module '@/lib/platformStore' {
  // Legacy hook shape (no-op). Provided only to satisfy stale .d.ts references during incremental builds.
  interface LegacyPlatformState { platform: string; setPlatform: (p: string) => void; }
  // Exporting a dummy function to match possible import usage.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export const usePlatformStore: () => LegacyPlatformState;
  export {};
}