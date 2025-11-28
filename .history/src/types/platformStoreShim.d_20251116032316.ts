// Declaration-only shim replacing removed 'platformStore' implementation.
// Use PlatformContext instead (see platformContext.tsx).
declare module '@/lib/platformStore' {
  export type Platform = 'ALL' | 'ALIBABA' | 'C1688' | 'MADE_IN_CHINA' | 'INDIAMART';
  interface PlatformState { platform: Platform; setPlatform: (p: Platform) => void; }
  export function usePlatformStore(): PlatformState; // returns static defaults
  const _default: { usePlatformStore: typeof usePlatformStore };
  export default _default;
}