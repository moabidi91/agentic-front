import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface TokenExpiryContextValue {
  isExpired: boolean;
  /** Call this from an API client when a call comes back 401. */
  triggerExpiry: (retry: () => Promise<void>) => void;
  /** Called by TokenExpiredModal once the user supplies a fresh token and the retry succeeds. */
  resolve: () => void;
}

const Ctx = createContext<TokenExpiryContextValue | null>(null);

/**
 * §13 Reprise sur 401 (contrat-interface.md) — a pending call registers
 * itself here when it hits a 401; TokenExpiredModal re-collects a token and
 * replays that exact call, so the conversation never loses its place.
 * MockApiClient never expires a token today, so this stays dormant until
 * a real HttpApiClient calls triggerExpiry() from its 401 handling —
 * wired here so screens don't need to change when that lands.
 */
export function TokenExpiryProvider({ children }: { children: ReactNode }) {
  const [isExpired, setIsExpired] = useState(false);
  const pendingRetry = useRef<(() => Promise<void>) | null>(null);

  const triggerExpiry = useCallback((retry: () => Promise<void>) => {
    pendingRetry.current = retry;
    setIsExpired(true);
  }, []);

  const resolve = useCallback(() => {
    pendingRetry.current = null;
    setIsExpired(false);
  }, []);

  const retryPending = useCallback(async () => {
    const retry = pendingRetry.current;
    if (retry) await retry();
    resolve();
  }, [resolve]);

  return (
    <Ctx.Provider value={{ isExpired, triggerExpiry, resolve: retryPending }}>{children}</Ctx.Provider>
  );
}

export function useTokenExpiry(): TokenExpiryContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTokenExpiry() must be used within <TokenExpiryProvider>');
  return ctx;
}
