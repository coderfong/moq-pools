import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Platform = 'ALL' | 'ALIBABA' | 'C1688' | 'MADE_IN_CHINA' | 'INDIAMART';

interface PlatformContextValue {
  platform: Platform;
  setPlatform: (p: Platform) => void;
}

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

export function PlatformProvider({ children, initial }: { children: ReactNode; initial?: Platform }) {
  const [platform, setPlatformState] = useState<Platform>(initial || 'ALL');
  const setPlatform = useCallback((p: Platform) => setPlatformState(p), []);
  return (
    <PlatformContext.Provider value={{ platform, setPlatform }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within <PlatformProvider>');
  return ctx;
}
