// Local stub for 'zustand' to satisfy legacy code without installing the package.
// Provides only the minimal typings needed for the deprecated platform store.
declare module 'zustand' {
  export type StateCreator<T> = (set: (partial: Partial<T>) => void) => T;
  export function create<T>(init: StateCreator<T>): () => T;
}
