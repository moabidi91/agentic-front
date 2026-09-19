import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApi } from '../api/context';
import { isSecretField, resolveCredentialFields } from '../api/credentials';
import type { ChatMessage, EffortLevel, ModelOption, PauseReason, PromptRef, SessionSnapshot, SignInConfig, SkillRef } from '../api/types';
import { saveSignInPrefs } from './signInPrefs';
import { useTokenExpiry } from './TokenExpiryContext';

/** Keeps only the fields the model marked `secret: false` — an unknown key (not in the model's own field list) is dropped too, fail closed. */
function nonSecretCredentials(model: ModelOption, credentials: Record<string, string> | undefined): Record<string, string> {
  if (!credentials) return {};
  const fields = resolveCredentialFields(model);
  return Object.fromEntries(
    Object.entries(credentials).filter(([key]) => {
      const field = fields.find((f) => f.key === key);
      return field !== undefined && !isSecretField(field);
    }),
  );
}

const FIRST_RUN_KEY = 'agentic-front.hasConnectedBefore.v1';

interface ConnectionInfo {
  conversationId: string;
  userId: string;
  model: ModelOption;
  workingSpace?: string;
  skills: SkillRef[];
  /** Front-only — loaded from a local folder at sign-in, never sent to the backend. Powers the "/" picker in Chat. */
  prompts: PromptRef[];
  effort: EffortLevel;
}

interface SessionContextValue {
  connection: ConnectionInfo | null;
  snapshot: SessionSnapshot | null;
  messages: ChatMessage[];
  isFirstRun: boolean;
  /**
   * Why the backend paused this session, when it is paused — §13. Non-null exactly while
   * `snapshot.status === 'PAUSED'` and the detail route answered.
   */
  pause: PauseReason | null;
  signIn: (config: SignInConfig, model: ModelOption, prompts?: PromptRef[], promptsFolderPath?: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  interrupt: () => Promise<void>;
  /** Re-opens the credential pop-in for a session that is already paused (the send gesture). */
  requestCredentials: () => void;
  markConnectedOnce: () => void;
  resetConfiguration: () => void;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { triggerExpiry } = useTokenExpiry();
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  /** Detail of the pause, tagged with the session it was read for — see `pause` below. */
  const [pauseDetail, setPauseDetail] = useState<{ conversationId: string; reason: PauseReason | null } | null>(null);
  const [isFirstRun, setIsFirstRun] = useState(() => {
    try {
      return localStorage.getItem(FIRST_RUN_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const unsubscribers = useRef<Array<() => void>>([]);

  const teardown = useCallback(() => {
    unsubscribers.current.forEach((fn) => fn());
    unsubscribers.current = [];
  }, []);

  useEffect(() => teardown, [teardown]);

  const signIn = useCallback(
    async (config: SignInConfig, model: ModelOption, prompts: PromptRef[] = [], promptsFolderPath?: string) => {
      const snap = await api.signIn(config);
      teardown();
      setSnapshot(snap);
      setMessages([]);
      setConnection({
        conversationId: snap.conversationId,
        userId: config.userId,
        model,
        workingSpace: config.workingSpace,
        skills: config.skills,
        prompts,
        effort: config.effort,
      });
      unsubscribers.current.push(api.subscribeSession(snap.conversationId, setSnapshot));
      unsubscribers.current.push(
        api.subscribeMessages(snap.conversationId, (m) => setMessages((prev) => [...prev, m])),
      );
      // Remember this setup (never a secret field, e.g. the token) so a returning
      // launch doesn't redo it — see signInPrefs.ts and api/credentials.ts.
      saveSignInPrefs({
        userId: config.userId,
        modelId: config.modelId,
        workingSpace: config.workingSpace,
        skills: config.skills,
        effort: config.effort,
        promptsFolderPath,
        credentials: nonSecretCredentials(model, config.credentials),
      }).catch(() => {});
    },
    [api, teardown],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!connection) throw new Error('Not signed in');
      await api.sendMessage(connection.conversationId, text);
    },
    [api, connection],
  );

  const interrupt = useCallback(async () => {
    if (!connection) return;
    await api.interrupt(connection.conversationId);
  }, [api, connection]);

  // ---- §13 Reprise sur 401 -----------------------------------------------------------------
  // The local API is not authenticated and never answers 401 itself: what the front sees is the
  // backend having paused the session because the *model* refused a call (ADR-025). So the
  // trigger is the snapshot, not a caught error.
  const conversationId = connection?.conversationId ?? null;
  const isPaused = snapshot?.status === 'PAUSED';

  /**
   * The gesture, in the order the contract fixes it (§7.2 point 3): write the credentials where
   * the transport reads them, then resume the loop exactly where it stopped. Two calls, never
   * one, and never in the other order.
   */
  const resumeWithCredentials = useCallback(
    async (credentials: Record<string, string>) => {
      if (!conversationId) return;
      await api.setCredentials(credentials);
      const snap = await api.resume(conversationId);
      setSnapshot(snap);
    },
    [api, conversationId],
  );

  // Entering the paused state reads why and opens the credential pop-in with that reason. The
  // detail is tagged with the session it describes, and `pause` below is derived from the current
  // status: leaving the paused state (resume, interrupt, a new session) drops it without anything
  // having to be reset.
  useEffect(() => {
    if (!conversationId || !isPaused) return;
    let cancelled = false;
    void (async () => {
      let reason: PauseReason | null = null;
      try {
        reason = await api.pauseReason(conversationId);
      } catch {
        // The detail route is unreachable; that the session is paused is not in doubt, the
        // snapshot said so. The pop-in opens without the sentence rather than not at all.
      }
      if (cancelled) return;
      setPauseDetail({ conversationId, reason });
      triggerExpiry(resumeWithCredentials, reason);
    })();
    return () => {
      cancelled = true;
    };
  }, [api, conversationId, isPaused, resumeWithCredentials, triggerExpiry]);

  const pause = isPaused && pauseDetail?.conversationId === conversationId ? pauseDetail.reason : null;

  /** Chat's send button while the session is paused — it re-opens the form, it never sends. */
  const requestCredentials = useCallback(() => {
    if (!isPaused) return;
    triggerExpiry(resumeWithCredentials, pause);
  }, [isPaused, pause, resumeWithCredentials, triggerExpiry]);

  const markConnectedOnce = useCallback(() => {
    try {
      localStorage.setItem(FIRST_RUN_KEY, '1');
    } catch {
      // ignore
    }
    setIsFirstRun(false);
  }, []);

  const resetConfiguration = useCallback(() => {
    if (connection) {
      api.interrupt(connection.conversationId).catch(() => {});
    }
    teardown();
    setConnection(null);
    setSnapshot(null);
    setMessages([]);
  }, [api, connection, teardown]);

  return (
    <SessionCtx.Provider
      value={{ connection, snapshot, messages, isFirstRun, pause, signIn, sendMessage, interrupt, requestCredentials, markConnectedOnce, resetConfiguration }}
    >
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession() must be used within <SessionProvider>');
  return ctx;
}
