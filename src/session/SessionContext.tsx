import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApi } from '../api/context';
import type { ChatMessage, EffortLevel, ModelOption, PromptRef, SessionSnapshot, SignInConfig, SkillRef } from '../api/types';
import { saveSignInPrefs } from './signInPrefs';

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
  signIn: (config: SignInConfig, model: ModelOption, prompts?: PromptRef[], promptsFolderPath?: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  interrupt: () => Promise<void>;
  markConnectedOnce: () => void;
  resetConfiguration: () => void;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
      // Remember this setup (never the token) so a returning launch doesn't redo it — see signInPrefs.ts.
      saveSignInPrefs({
        userId: config.userId,
        modelId: config.modelId,
        workingSpace: config.workingSpace,
        skills: config.skills,
        effort: config.effort,
        promptsFolderPath,
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
      value={{ connection, snapshot, messages, isFirstRun, signIn, sendMessage, interrupt, markConnectedOnce, resetConfiguration }}
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
