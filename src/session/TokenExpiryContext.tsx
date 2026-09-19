import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { PauseReason } from '../api/types';

/** What the credential pop-in does once the user has filled the model's declared fields. */
export type CredentialRetry = (credentials: Record<string, string>) => Promise<void>;

interface TokenExpiryContextValue {
  /** True while the credential pop-in must be on screen. */
  isExpired: boolean;
  /** Why the backend paused the session, when it said so — `null` for a pause it did not detail. */
  reason: PauseReason | null;
  /** Opens the pop-in and registers what to do with the credentials it collects. */
  triggerExpiry: (retry: CredentialRetry, reason?: PauseReason | null) => void;
  /** Called by TokenExpiredModal with the filled fields; runs the registered action. */
  resolve: (credentials: Record<string, string>) => Promise<void>;
  /** Closes the pop-in without doing anything — the session stays paused and the banner stays. */
  dismiss: () => void;
}

const Ctx = createContext<TokenExpiryContextValue | null>(null);

/**
 * §13 Reprise sur 401 (contrat-interface.md) — the one place that knows a session is waiting for
 * credentials, and what to do once it has them.
 *
 * The trigger is **not** a 401 on the local API: that API is not authenticated and never answers
 * one. It is the backend pausing the session when the *model* refuses it (ADR-025), which the
 * front sees as `SessionSnapshot.status === 'PAUSED'`; `SessionContext` reads the reason from
 * `GET /sessions/{sid}/pause` and registers the retry here. The retry is one gesture in two calls:
 * `POST /credentials`, then `POST /sessions/{sid}/resume`.
 *
 * Nothing here keeps a credential: the map goes from the pop-in to the retry and is dropped with
 * the render. It is never logged, never persisted, never put back in a field.
 */
export function TokenExpiryProvider({ children }: { children: ReactNode }) {
  const [isExpired, setIsExpired] = useState(false);
  const [reason, setReason] = useState<PauseReason | null>(null);
  const pendingRetry = useRef<CredentialRetry | null>(null);

  const triggerExpiry = useCallback((retry: CredentialRetry, pauseReason: PauseReason | null = null) => {
    pendingRetry.current = retry;
    setReason(pauseReason);
    setIsExpired(true);
  }, []);

  const dismiss = useCallback(() => {
    setIsExpired(false);
  }, []);

  const resolve = useCallback(async (credentials: Record<string, string>) => {
    const retry = pendingRetry.current;
    if (retry) await retry(credentials);
    pendingRetry.current = null;
    setReason(null);
    setIsExpired(false);
  }, []);

  return (
    <Ctx.Provider value={{ isExpired, reason, triggerExpiry, resolve, dismiss }}>{children}</Ctx.Provider>
  );
}

export function useTokenExpiry(): TokenExpiryContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTokenExpiry() must be used within <TokenExpiryProvider>');
  return ctx;
}
