import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { IconId } from './icons';

export interface Branding {
  appName: string;
  appLabel: string;
  iconId: IconId;
}

const DEFAULT_BRANDING: Branding = { appName: 'Console', appLabel: 'OPS', iconId: 'pulse' };

const STORAGE_KEY = 'agentic-front.branding.v1';

interface BrandingContextValue {
  branding: Branding;
  /** True once the user has been through WelcomeScreen at least once (or a saved choice exists). */
  hasChosenBranding: boolean;
  setBranding: (branding: Branding) => void;
  resetBranding: () => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

function readStored(): { branding: Branding; hasChosenBranding: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { branding: DEFAULT_BRANDING, hasChosenBranding: false };
    const parsed = JSON.parse(raw) as Branding;
    return { branding: { ...DEFAULT_BRANDING, ...parsed }, hasChosenBranding: true };
  } catch {
    return { branding: DEFAULT_BRANDING, hasChosenBranding: false };
  }
}

/**
 * Branding (name / label / icon) is chosen by the end user on WelcomeScreen,
 * never hardcoded (implementation-spec.md §7bis). Persisted to localStorage
 * for now — swap for the Tauri store plugin (or a config file) once the
 * desktop shell is wired up; no backend need for v1 (contrat-interface.md §15).
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const [{ branding, hasChosenBranding }, setState] = useState(readStored);

  useEffect(() => {
    if (hasChosenBranding) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
      } catch {
        // localStorage unavailable (private mode, etc.) — branding stays in-memory for this run.
      }
    }
  }, [branding, hasChosenBranding]);

  const value: BrandingContextValue = {
    branding,
    hasChosenBranding,
    setBranding: (next) => setState({ branding: next, hasChosenBranding: true }),
    resetBranding: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setState({ branding: DEFAULT_BRANDING, hasChosenBranding: false });
    },
  };

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding() must be used within <BrandingProvider>');
  return ctx;
}
