import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ApiClient } from './ApiClient';
import { HttpApiClient } from './http';
import { MockApiClient } from './mock';

const ApiContext = createContext<ApiClient | null>(null);

/** Base URL of the real API, e.g. `http://127.0.0.1:8765/api/v1`. Unset ⇒ in-memory mock. */
const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

/**
 * Single place that decides which ApiClient implementation the app talks
 * to: HttpApiClient against a running agentic-local-app when
 * VITE_API_BASE_URL is set, MockApiClient otherwise. No screen changes
 * either way — they only ever depend on the ApiClient interface.
 */
export function ApiProvider({ children }: { children: ReactNode }) {
  const client = useMemo<ApiClient>(
    () => (BASE_URL ? new HttpApiClient(BASE_URL) : new MockApiClient()),
    [],
  );
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiClient {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi() must be used within <ApiProvider>');
  return ctx;
}
