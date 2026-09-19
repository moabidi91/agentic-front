import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ApiClient } from './ApiClient';
import { MockApiClient } from './mock';

const ApiContext = createContext<ApiClient | null>(null);

/**
 * Single place that decides which ApiClient implementation the app talks
 * to. Today it's always the mock. Once the backend team confirms routes
 * (see contrat-interface.md), add an HttpApiClient and switch it here
 * behind an env flag — no screen needs to change.
 */
export function ApiProvider({ children }: { children: ReactNode }) {
  const client = useMemo<ApiClient>(() => new MockApiClient(), []);
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiClient {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi() must be used within <ApiProvider>');
  return ctx;
}
